const RASTER_SIZE = 420;
const RASTER_SIZE_CRISP = 1920;

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

export function sampleImageDeterministic(
	imageData,
	count,
	seed = 1,
	alphaThreshold = 10,
	opts = {},
) {
	const rand = mulberry32(seed);
	const crisp = !!opts.crispText;
	const jitter = crisp ? 0 : Math.max(0, Math.min(1, opts.sampleJitter ?? 1));
	const zSpread = crisp ? 0.0015 : 0.02;

	const w = imageData.width;
	const h = imageData.height;
	const pixels = [];

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			if (imageData.data[i * 4 + 3] < alphaThreshold) continue;
			pixels.push(i);
		}
	}

	if (pixels.length === 0) {
		return {
			positions: new Float32Array(count * 3),
			colors: new Float32Array(count * 3),
			shades: new Float32Array(count),
		};
	}

	let target = Math.max(16, Math.round(count));
	if (crisp) {
		const dense = Math.min(pixels.length, 110000);
		target = Math.min(
			110000,
			Math.max(target, Math.min(dense, Math.max(64000, Math.floor(pixels.length * 0.85)))),
		);
	}

	const positions = new Float32Array(target * 3);
	const colors = new Float32Array(target * 3);
	const shades = new Float32Array(target);
	const longest = Math.max(w, h);
	const n = pixels.length;

	const writeParticle = (slot, pIndex, ox = 0, oy = 0) => {
		const p = pixels[pIndex];
		const px = p % w;
		const py = Math.floor(p / w);
		positions[slot * 3] = (px + 0.5 + ox - w / 2) / longest;
		positions[slot * 3 + 1] = -(py + 0.5 + oy - h / 2) / longest;
		positions[slot * 3 + 2] = (rand() - 0.5) * zSpread;
		colors[slot * 3] = imageData.data[p * 4] / 255;
		colors[slot * 3 + 1] = imageData.data[p * 4 + 1] / 255;
		colors[slot * 3 + 2] = imageData.data[p * 4 + 2] / 255;
		shades[slot] = 1;
	};

	if (crisp) {
		if (target <= n) {
			const step = n / target;
			for (let i = 0; i < target; i++) {
				writeParticle(i, Math.min(n - 1, Math.floor(i * step)));
			}
		} else {
			for (let i = 0; i < n; i++) writeParticle(i, i);
			for (let i = n; i < target; i++) {
				const pIndex = (i * 2654435761) % n;
				writeParticle(
					i,
					pIndex,
					((i * 0.37) % 1) * 0.35 - 0.175,
					((i * 0.71) % 1) * 0.35 - 0.175,
				);
			}
		}
		return normalizeCloud({ positions, colors, shades });
	}

	const weights = [];
	let totalWeight = 0;
	for (let k = 0; k < n; k++) {
		const p = pixels[k];
		const alpha = imageData.data[p * 4 + 3];
		totalWeight += alpha;
		weights.push(totalWeight);
	}

	for (let i = 0; i < target; i++) {
		const pick = rand() * totalWeight;
		let lo = 0;
		let hi = weights.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (weights[mid] < pick) lo = mid + 1;
			else hi = mid;
		}
		const jx = jitter > 0 ? (rand() - 0.5) * jitter : 0;
		const jy = jitter > 0 ? (rand() - 0.5) * jitter : 0;
		writeParticle(i, lo, jx, jy);
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
		const rasterSize = processOpts.crispText
			? Math.max(processOpts.rasterSize || RASTER_SIZE_CRISP, RASTER_SIZE_CRISP)
			: processOpts.rasterSize || RASTER_SIZE;
		const raw = await fetchAndRasterize(url, rasterSize);
		const processed = preprocessImageData(raw, processOpts);
		return sampleImageDeterministic(
			processed,
			Math.max(Math.round(count), 16),
			1,
			processOpts.alphaThreshold ?? 10,
			{
				sampleJitter: processOpts.crispText ? 0 : (processOpts.sampleJitter ?? 1),
				crispText: !!processOpts.crispText,
			},
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
