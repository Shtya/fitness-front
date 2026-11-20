'use client';

/**
 * Photo preparation, all on the device: decode → rotate/crop → downscale to a ~768px medium and
 * ~256px thumbnail JPEG (re-encoding strips EXIF/GPS) → dominant colours (k-means), dHash and a
 * SHA-256 used to cache AI results per photo.
 */
import { dHash, dominantColors } from '../engine/pixels.js';

export const MEDIUM_EDGE = 768;
export const THUMB_EDGE = 256;

export function loadImage(source) {
	return new Promise((resolve, reject) => {
		const url = typeof source === 'string' ? source : URL.createObjectURL(source);
		const img = new Image();
		img.onload = () => {
			if (typeof source !== 'string') URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			if (typeof source !== 'string') URL.revokeObjectURL(url);
			reject(new Error('image'));
		};
		img.src = url;
	});
}

/** Draw with rotation (0/90/180/270) and a centred zoom crop (1 = full frame). */
export function renderTo(img, maxEdge, { rotation = 0, zoom = 1 } = {}) {
	const turned = rotation % 180 !== 0;
	const srcW = img.naturalWidth || img.width;
	const srcH = img.naturalHeight || img.height;
	const cropW = srcW / zoom;
	const cropH = srcH / zoom;
	const outW0 = turned ? cropH : cropW;
	const outH0 = turned ? cropW : cropH;
	const scale = Math.min(1, maxEdge / Math.max(outW0, outH0));
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(outW0 * scale));
	canvas.height = Math.max(1, Math.round(outH0 * scale));
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate((rotation * Math.PI) / 180);
	const drawW = cropW * scale;
	const drawH = cropH * scale;
	ctx.drawImage(img, (srcW - cropW) / 2, (srcH - cropH) / 2, cropW, cropH, -drawW / 2, -drawH / 2, drawW, drawH);
	return canvas;
}

const toBlob = (canvas, quality = 0.85) => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));

async function sha256(blob) {
	const buffer = await blob.arrayBuffer();
	const digest = await crypto.subtle.digest('SHA-256', buffer);
	return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function hashOf(canvas) {
	const small = document.createElement('canvas');
	small.width = 9;
	small.height = 8;
	const ctx = small.getContext('2d', { willReadFrequently: true });
	ctx.drawImage(canvas, 0, 0, 9, 8);
	const { data } = ctx.getImageData(0, 0, 9, 8);
	const gray = [];
	for (let i = 0; i < data.length; i += 4) gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
	return dHash(gray);
}

/**
 * Prepare one photo. Returns { medium, thumb (Blobs), colors [{hex, share}], hash, sha, previewUrl }.
 * `whiteGains` (optional) applies the white-reference correction to the colour analysis only.
 */
export async function preparePhoto(file, { rotation = 0, zoom = 1, applyGains } = {}) {
	const img = await loadImage(file);
	const mediumCanvas = renderTo(img, MEDIUM_EDGE, { rotation, zoom });
	const thumbCanvas = renderTo(img, THUMB_EDGE, { rotation, zoom });
	const [medium, thumb] = await Promise.all([toBlob(mediumCanvas, 0.85), toBlob(thumbCanvas, 0.8)]);
	// Colours from a ~200px copy (fast, still accurate).
	const analysisCanvas = renderTo(img, 200, { rotation, zoom });
	const ctx = analysisCanvas.getContext('2d', { willReadFrequently: true });
	const imageData = ctx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
	if (applyGains) applyGains(imageData.data);
	const colors = dominantColors(imageData.data, analysisCanvas.width, analysisCanvas.height, { k: 3 });
	const [sha] = await Promise.all([sha256(medium)]);
	return { medium, thumb, colors, hash: hashOf(thumbCanvas), sha, width: mediumCanvas.width, height: mediumCanvas.height };
}

export async function blobToBase64(blob) {
	const buffer = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < buffer.length; i += chunk) binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
	return btoa(binary);
}

/** Run async jobs with limited concurrency (batch uploads). */
export async function runQueue(jobs, worker, concurrency = 3) {
	let next = 0;
	const runners = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
		while (next < jobs.length) {
			const index = next;
			next += 1;
			await worker(jobs[index], index);
		}
	});
	await Promise.all(runners);
}
