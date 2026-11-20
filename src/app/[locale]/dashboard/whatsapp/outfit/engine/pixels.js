/**
 * Pixel analysis (pure, runs in the browser and in node tests):
 *  - dominantColors: k-means in CIE Lab on the garment (background estimated from the border).
 *  - dHash: 64-bit difference hash of a 9×8 grey thumbnail, for near-duplicate photos.
 */
import { colorDistance, rgbToHex, rgbToLab } from './color.js';

function labDist2(a, b) {
	const dL = a.L - b.L;
	const da = a.a - b.a;
	const db = a.b - b.b;
	return dL * dL + da * da + db * db;
}

/** Median Lab of the outer border (≈4%) — the likely background. */
function borderLab(data, width, height) {
	const band = Math.max(1, Math.round(Math.min(width, height) * 0.04));
	const Ls = [];
	const As = [];
	const Bs = [];
	const step = Math.max(1, Math.round((width + height) / 160));
	const push = (x, y) => {
		const i = (y * width + x) * 4;
		if (data[i + 3] < 128) return;
		const lab = rgbToLab({ r: data[i], g: data[i + 1], b: data[i + 2] });
		Ls.push(lab.L);
		As.push(lab.a);
		Bs.push(lab.b);
	};
	for (let x = 0; x < width; x += step) {
		for (let y = 0; y < band; y += 1) {
			push(x, y);
			push(x, height - 1 - y);
		}
	}
	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < band; x += 1) {
			push(x, y);
			push(width - 1 - x, y);
		}
	}
	if (!Ls.length) return null;
	const med = list => list.sort((p, q) => p - q)[Math.floor(list.length / 2)];
	return { L: med(Ls), a: med(As), b: med(Bs) };
}

/**
 * Dominant colours of a garment photo. Samples a grid (≤ ~4k points), drops pixels close to
 * the border colour (background), weights the centre higher, and clusters with deterministic
 * k-means (farthest-point init). Returns [{ hex, share }] sorted by share.
 */
export function dominantColors(data, width, height, { k = 3, iterations = 10, background = true } = {}) {
	const total = width * height;
	const step = Math.max(1, Math.floor(Math.sqrt(total / 4000)));
	const bg = background ? borderLab(data, width, height) : null;
	const points = [];
	const cx = width / 2;
	const cy = height / 2;
	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < width; x += step) {
			const i = (y * width + x) * 4;
			if (data[i + 3] < 128) continue;
			const lab = rgbToLab({ r: data[i], g: data[i + 1], b: data[i + 2] });
			if (bg && labDist2(lab, bg) < 14 * 14) continue;
			const dx = (x - cx) / cx;
			const dy = (y - cy) / cy;
			const weight = 1.6 - Math.min(1, Math.hypot(dx, dy)); // centre counts more
			points.push({ lab, rgb: [data[i], data[i + 1], data[i + 2]], w: weight });
		}
	}
	if (points.length < 12) {
		// Almost everything matched the "background": the photo is a close-up of the fabric.
		return background ? dominantColors(data, width, height, { k, iterations, background: false }) : [];
	}

	// Deterministic init: weighted-mean point, then repeatedly the point farthest from all centres.
	const centres = [];
	const mean = points.reduce((acc, p) => ({ L: acc.L + p.lab.L * p.w, a: acc.a + p.lab.a * p.w, b: acc.b + p.lab.b * p.w, w: acc.w + p.w }), { L: 0, a: 0, b: 0, w: 0 });
	centres.push({ L: mean.L / mean.w, a: mean.a / mean.w, b: mean.b / mean.w });
	while (centres.length < k) {
		let best = null;
		let bestD = -1;
		for (const p of points) {
			const d = Math.min(...centres.map(c => labDist2(p.lab, c)));
			if (d > bestD) {
				bestD = d;
				best = p;
			}
		}
		if (!best || bestD < 25) break;
		centres.push({ ...best.lab });
	}

	const assign = new Array(points.length).fill(0);
	for (let it = 0; it < iterations; it += 1) {
		for (let i = 0; i < points.length; i += 1) {
			let bi = 0;
			let bd = Infinity;
			for (let c = 0; c < centres.length; c += 1) {
				const d = labDist2(points[i].lab, centres[c]);
				if (d < bd) {
					bd = d;
					bi = c;
				}
			}
			assign[i] = bi;
		}
		const sums = centres.map(() => ({ L: 0, a: 0, b: 0, w: 0 }));
		points.forEach((p, i) => {
			const s = sums[assign[i]];
			s.L += p.lab.L * p.w;
			s.a += p.lab.a * p.w;
			s.b += p.lab.b * p.w;
			s.w += p.w;
		});
		sums.forEach((s, c) => {
			if (s.w) centres[c] = { L: s.L / s.w, a: s.a / s.w, b: s.b / s.w };
		});
	}

	// Report each cluster by its mean sRGB (what the eye sees), with its weighted share.
	const acc = centres.map(() => ({ r: 0, g: 0, b: 0, w: 0 }));
	points.forEach((p, i) => {
		const a = acc[assign[i]];
		a.r += p.rgb[0] * p.w;
		a.g += p.rgb[1] * p.w;
		a.b += p.rgb[2] * p.w;
		a.w += p.w;
	});
	const totalW = acc.reduce((sum, a) => sum + a.w, 0) || 1;
	const clusters = acc
		.filter(a => a.w > 0)
		.map(a => ({ hex: rgbToHex({ r: a.r / a.w, g: a.g / a.w, b: a.b / a.w }), share: a.w / totalW }))
		.sort((p, q) => q.share - p.share);
	// Merge clusters that are visually the same colour.
	const merged = [];
	for (const c of clusters) {
		const twin = merged.find(m => colorDistance(m.hex, c.hex) < 6);
		if (twin) twin.share += c.share;
		else merged.push({ ...c });
	}
	return merged.map(c => ({ hex: c.hex, share: Math.round(c.share * 1000) / 1000 }));
}

/** Pixel colour vs the AI's colour: trust pixels when they disagree by more than ~15 ΔE2000. */
export function reconcileColor(aiHex, pixelHex, threshold = 15) {
	if (!pixelHex) return { hex: aiHex, source: 'ai', verifiedByPixels: false, deltaE: null };
	if (!aiHex) return { hex: pixelHex, source: 'pixels', verifiedByPixels: true, deltaE: null };
	const deltaE = colorDistance(aiHex, pixelHex);
	return deltaE > threshold
		? { hex: pixelHex, source: 'pixels', verifiedByPixels: true, deltaE }
		: { hex: aiHex, source: 'ai', verifiedByPixels: deltaE <= threshold, deltaE };
}

/** dHash of a 9×8 grey image (72 values, row-major) → 16-char hex. */
export function dHash(gray9x8) {
	let bits = '';
	for (let y = 0; y < 8; y += 1) {
		for (let x = 0; x < 8; x += 1) bits += gray9x8[y * 9 + x] > gray9x8[y * 9 + x + 1] ? '1' : '0';
	}
	let hex = '';
	for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
	return hex;
}

export function hammingHex(a, b) {
	if (!a || !b || a.length !== b.length) return 64;
	let d = 0;
	for (let i = 0; i < a.length; i += 1) {
		let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
		while (x) {
			d += x & 1;
			x >>= 1;
		}
	}
	return d;
}
