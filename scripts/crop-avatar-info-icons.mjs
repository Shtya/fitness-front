import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const root = 'E:\\.env\\Me\\So7baFit\\frontend\\public\\fake-chat\\avatar-info';
const outDir = path.join(root, 'ui');
fs.mkdirSync(outDir, { recursive: true });

const WA = { r: 29, g: 171, b: 97 }; // #1dab61

const map = {
	voice: 'voice.png',
	video: 'video.png',
	search: 'search.png',
	media: 'media.png',
	storage: 'storage.png',
	kept: 'kept.png',
	notifications: 'notifications.png',
	theme: 'theme.png',
	'save-photos': 'save-photos.png',
	disappearing: 'disappearing.png',
	transcript: 'transcript.png',
	'lock-chat': 'lock-chat.png',
	privacy: 'privacy.png',
	encryption: 'encryption.png',
	'add-group': 'add-group.png',
};

function alphaBBox(data, w, h, minA = 40) {
	let minX = w;
	let minY = h;
	let maxX = -1;
	let maxY = -1;
	let count = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const a = data[(y * w + x) * 4 + 3];
			if (a < minA) continue;
			count++;
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		}
	}
	if (maxX < 0) return null;
	return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, count };
}

function greenBBox(data, w, h) {
	let minX = w;
	let minY = h;
	let maxX = -1;
	let maxY = -1;
	let count = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const a = data[i + 3];
			if (a < 40) continue;
			if (g > 100 && g > r + 25 && g > b + 15) {
				count++;
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}
	}
	if (count < 200 || maxX < 0) return null;
	return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, count };
}

function inkBBox(data, w, h) {
	// Non-white, non-transparent ink (black line icons on light/transparent)
	let minX = w;
	let minY = h;
	let maxX = -1;
	let maxY = -1;
	let count = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const a = data[i + 3];
			if (a < 40) continue;
			const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			if (lum > 230) continue;
			count++;
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		}
	}
	if (count < 80 || maxX < 0) return null;
	return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, count };
}

function padBox(box, w, h, ratio = 0.14) {
	const pad = Math.round(Math.max(box.width, box.height) * ratio);
	const left = Math.max(0, box.left - pad);
	const top = Math.max(0, box.top - pad);
	const right = Math.min(w - 1, box.left + box.width - 1 + pad);
	const bottom = Math.min(h - 1, box.top + box.height - 1 + pad);
	return { left, top, width: right - left + 1, height: bottom - top + 1, count: box.count };
}

function squareBox(box, w, h) {
	const side = Math.max(box.width, box.height);
	let left = Math.round(box.left - (side - box.width) / 2);
	let top = Math.round(box.top - (side - box.height) / 2);
	left = Math.max(0, Math.min(w - side, left));
	top = Math.max(0, Math.min(h - side, top));
	const width = Math.min(side, w - left);
	const height = Math.min(side, h - top);
	return { left, top, width, height };
}

function recolorToWaGreen(data, mode) {
	for (let i = 0; i < data.length; i += 4) {
		const a = data[i + 3];
		if (a < 12) {
			data[i + 3] = 0;
			continue;
		}
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		const isGreen = g > 90 && g > r + 15 && g > b + 8;

		if (mode === 'green') {
			if (isGreen) {
				data[i] = WA.r;
				data[i + 1] = WA.g;
				data[i + 2] = WA.b;
				continue;
			}
			// screenshot black plate behind green glyph
			if (lum < 45) {
				data[i + 3] = 0;
				continue;
			}
			if (lum > 230) {
				data[i + 3] = 0;
				continue;
			}
		}

		// Black / dark ink icons (media, lock, etc.) → WA green, keep alpha
		if (lum < 230) {
			data[i] = WA.r;
			data[i + 1] = WA.g;
			data[i + 2] = WA.b;
			continue;
		}
		data[i + 3] = 0;
	}
}

for (const [key, file] of Object.entries(map)) {
	const src = path.join(root, file);
	if (!fs.existsSync(src)) {
		console.log('MISSING', file);
		continue;
	}

	const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

	let mode = 'alpha';
	let box = greenBBox(data, info.width, info.height);
	if (box && box.count > 500) {
		mode = 'green';
	} else {
		box = inkBBox(data, info.width, info.height);
		mode = box ? 'ink' : 'alpha';
		if (!box) box = alphaBBox(data, info.width, info.height);
	}
	if (!box) {
		console.log('NO CONTENT', key);
		continue;
	}

	box = padBox(box, info.width, info.height, 0.12);
	const sq = squareBox(box, info.width, info.height);

	const cropped = await sharp(src)
		.ensureAlpha()
		.extract(sq)
		.resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.raw()
		.toBuffer({ resolveWithObject: true });

	recolorToWaGreen(cropped.data, mode);

	const out = path.join(outDir, key + '.png');
	await sharp(cropped.data, {
		raw: { width: cropped.info.width, height: cropped.info.height, channels: 4 },
	})
		.png()
		.toFile(out);

	console.log(
		key.padEnd(16),
		mode,
		info.width + 'x' + info.height,
		'->',
		sq.left + ',' + sq.top,
		sq.width + 'x' + sq.height,
		'n',
		box.count || 0,
	);
}

console.log('done →', outDir);
