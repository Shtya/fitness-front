const RASTER_SIZE = 420;

function mulberry32(seed) {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

export function preprocessImageData(imageData, opts = {}) {
	const {
		alphaThreshold = 10,
		brightness = 0,
		contrast = 0,
		invertAlpha = false,
		imageScale = 1,
	} = opts;

	const src = imageData;
	const scale = Math.max(0.2, Math.min(imageScale || 1, 2));
	let width = src.width;
	let height = src.height;
	let data = new Uint8ClampedArray(src.data);

	if (Math.abs(scale - 1) > 0.01) {
		const canvas = document.createElement('canvas');
		const tw = Math.max(1, Math.round(src.width * scale));
		const th = Math.max(1, Math.round(src.height * scale));
		canvas.width = tw;
		canvas.height = th;
		const ctx = canvas.getContext('2d');
		const tmp = document.createElement('canvas');
		tmp.width = src.width;
		tmp.height = src.height;
		tmp.getContext('2d').putImageData(src, 0, 0);
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(tmp, 0, 0, tw, th);
		const scaled = ctx.getImageData(0, 0, tw, th);
		data = new Uint8ClampedArray(scaled.data);
		width = tw;
		height = th;
	}

	const b = brightness / 100;
	const c = contrast / 100;
	const factor = (1 + c) / (1.0001 - c);

	for (let i = 0; i < data.length; i += 4) {
		let r = data[i] / 255;
		let g = data[i + 1] / 255;
		let bl = data[i + 2] / 255;
		let a = data[i + 3];

		r = (r - 0.5) * factor + 0.5 + b;
		g = (g - 0.5) * factor + 0.5 + b;
		bl = (bl - 0.5) * factor + 0.5 + b;

		data[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
		data[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
		data[i + 2] = Math.max(0, Math.min(255, Math.round(bl * 255)));

		if (invertAlpha) a = 255 - a;
		if (a < alphaThreshold) a = 0;
		data[i + 3] = a;
	}

	return new ImageData(data, width, height);
}

export function normalizeCloud(sample) {
	const p = sample.positions;
	if (!p || p.length === 0) return sample;
	let minX = Infinity;
	let minY = Infinity;
	let minZ = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let maxZ = -Infinity;
	for (let i = 0; i < p.length; i += 3) {
		minX = Math.min(minX, p[i]);
		maxX = Math.max(maxX, p[i]);
		minY = Math.min(minY, p[i + 1]);
		maxY = Math.max(maxY, p[i + 1]);
		minZ = Math.min(minZ, p[i + 2]);
		maxZ = Math.max(maxZ, p[i + 2]);
	}
	const cx = (minX + maxX) / 2;
	const cy = (minY + maxY) / 2;
	const cz = (minZ + maxZ) / 2;
	const inv = 1 / Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-4);
	for (let i = 0; i < p.length; i += 3) {
		p[i] = (p[i] - cx) * inv;
		p[i + 1] = (p[i + 1] - cy) * inv;
		p[i + 2] = (p[i + 2] - cz) * inv;
	}
	return sample;
}

export function sampleImageDeterministic(imageData, count, seed = 1, alphaThreshold = 10) {
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const shades = new Float32Array(count);
	const rand = mulberry32(seed);

	const pixels = [];
	const weights = [];
	let totalWeight = 0;
	for (let i = 0; i < imageData.width * imageData.height; i++) {
		const alpha = imageData.data[i * 4 + 3];
		if (alpha < alphaThreshold) continue;
		totalWeight += alpha;
		pixels.push(i);
		weights.push(totalWeight);
	}
	if (pixels.length === 0) return { positions, colors, shades };

	const longest = Math.max(imageData.width, imageData.height);
	for (let i = 0; i < count; i++) {
		const pick = rand() * totalWeight;
		let lo = 0;
		let hi = weights.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (weights[mid] < pick) lo = mid + 1;
			else hi = mid;
		}
		const p = pixels[lo];
		const px = p % imageData.width;
		const py = Math.floor(p / imageData.width);
		positions[i * 3] = (px + rand() - imageData.width / 2) / longest;
		positions[i * 3 + 1] = -(py + rand() - imageData.height / 2) / longest;
		positions[i * 3 + 2] = (rand() - 0.5) * 0.02;
		colors[i * 3] = imageData.data[p * 4] / 255;
		colors[i * 3 + 1] = imageData.data[p * 4 + 1] / 255;
		colors[i * 3 + 2] = imageData.data[p * 4 + 2] / 255;
		shades[i] = 1;
	}

	return normalizeCloud({ positions, colors, shades });
}

function sniffKind(bytes) {
	if (bytes.length < 4) return null;
	const ascii = (start, text) => {
		for (let i = 0; i < text.length; i++) {
			if (bytes[start + i] !== text.charCodeAt(i)) return false;
		}
		return true;
	};
	if (ascii(0, 'glTF')) return 'glb';
	if (bytes[0] === 0x89 && ascii(1, 'PNG')) return 'bitmap';
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'bitmap';
	if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'bitmap';
	if (ascii(0, 'GIF8')) return 'bitmap';
	let head = '';
	try {
		head = new TextDecoder()
			.decode(bytes.subarray(0, 2048))
			.replace(/^\uFEFF/, '')
			.trimStart();
	} catch {
		return null;
	}
	if (head.startsWith('{')) return 'gltf';
	if (head.startsWith('<')) return head.includes('<svg') ? 'svg' : null;
	return null;
}

function rasterizeImage(blob, rasterSize = RASTER_SIZE) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(blob);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			const width = image.naturalWidth || 1024;
			const height = image.naturalHeight || 1024;
			const ratio = Math.min(1, rasterSize / Math.max(width, height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(width * ratio));
			canvas.height = Math.max(1, Math.round(height * ratio));
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('2d context unavailable'));
				return;
			}
			ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
			resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Could not decode the image'));
		};
		image.src = url;
	});
}

export async function fetchAndRasterize(url, rasterSize = RASTER_SIZE) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const buffer = await response.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	const kind = sniffKind(bytes);
	if (!kind || kind === 'glb' || kind === 'gltf') {
		throw new Error('Unsupported or unrecognized image format for sampling');
	}
	const blob = new Blob([buffer], {
		type: kind === 'svg' ? 'image/svg+xml' : '',
	});
	return rasterizeImage(blob, rasterSize);
}

export async function sampleAssetFromUrl(url, count, processOpts = {}) {
	try {
		const raw = await fetchAndRasterize(url);
		const processed = preprocessImageData(raw, processOpts);
		return sampleImageDeterministic(
			processed,
			Math.max(Math.round(count), 16),
			1,
			processOpts.alphaThreshold ?? 10,
		);
	} catch (error) {
		const cors =
			error?.message?.includes('Failed to fetch') ||
			error?.name === 'TypeError';
		const err = new Error(
			cors
				? 'Unable to load image. The server may not allow cross-origin access. Try downloading the image into particle-assets instead.'
				: error?.message || 'Unable to load image.',
		);
		err.cause = error;
		throw err;
	}
}
