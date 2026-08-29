import { mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'src');
const args = process.argv.slice(2);
const targets = args.includes('chrome')
	? ['chrome']
	: args.includes('firefox')
		? ['firefox']
		: ['chrome', 'firefox'];
const dev = args.includes('--dev');
const apiBase =
	process.env.WEB_TRANSLATOR_API_BASE ||
	(dev ? 'http://localhost:8083/api/v1' : 'https://api.so7bafit.com/api/v1');
const webBase =
	process.env.WEB_TRANSLATOR_WEB_BASE ||
	(dev ? 'http://localhost:3000' : 'https://so7bafit.com');

function crc32(buf) {
	let c = 0xffffffff;
	for (const byte of buf) {
		c ^= byte;
		for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
	}
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const t = Buffer.from(type);
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length, 0);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
	return Buffer.concat([len, t, data, crc]);
}

/** Simple branded icon: indigo rounded square with white "S" block pixels. */
function writePng(file, size) {
	const rawRows = [];
	const pad = Math.max(1, Math.floor(size * 0.12));
	for (let y = 0; y < size; y += 1) {
		const row = Buffer.alloc(1 + size * 3);
		row[0] = 0;
		for (let x = 0; x < size; x += 1) {
			const edge = x < pad || y < pad || x >= size - pad || y >= size - pad;
			const cx = x / size;
			const cy = y / size;
			const inS =
				!edge &&
				((cy > 0.22 && cy < 0.38 && cx > 0.28 && cx < 0.72) ||
					(cy >= 0.38 && cy < 0.5 && cx > 0.28 && cx < 0.42) ||
					(cy >= 0.45 && cy < 0.58 && cx > 0.28 && cx < 0.72) ||
					(cy >= 0.58 && cy < 0.7 && cx > 0.58 && cx < 0.72) ||
					(cy >= 0.7 && cy < 0.82 && cx > 0.28 && cx < 0.72));
			const i = 1 + x * 3;
			if (inS) {
				row[i] = 255;
				row[i + 1] = 255;
				row[i + 2] = 255;
			} else {
				row[i] = 99;
				row[i + 1] = 102;
				row[i + 2] = 241;
			}
		}
		rawRows.push(row);
	}
	const raw = Buffer.concat(rawRows);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	const png = Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0)),
	]);
	writeFileSync(file, png);
}

function rewritePopupImports(popupJsPath) {
	const code = readFileSync(popupJsPath, 'utf8').replaceAll(
		"from '../shared/",
		"from './shared/",
	);
	writeFileSync(popupJsPath, code);
}

function copyTarget(name) {
	const dest = join(root, 'dist', name);
	rmSync(dest, { recursive: true, force: true });
	mkdirSync(join(dest, 'icons'), { recursive: true });
	mkdirSync(join(dest, 'shared'), { recursive: true });
	copyFileSync(join(src, 'background.js'), join(dest, 'background.js'));
	copyFileSync(join(src, 'content.js'), join(dest, 'content.js'));
	copyFileSync(join(src, 'popup', 'popup.html'), join(dest, 'popup.html'));
	copyFileSync(join(src, 'popup', 'popup.js'), join(dest, 'popup.js'));
	copyFileSync(join(src, 'popup', 'popup.css'), join(dest, 'popup.css'));
	cpSync(join(src, 'shared'), join(dest, 'shared'), {
		recursive: true,
		filter: (srcPath) => !/\.test\.(mjs|js)$/i.test(srcPath),
	});
	copyFileSync(join(src, `manifest.${name}.json`), join(dest, 'manifest.json'));
	rewritePopupImports(join(dest, 'popup.js'));
	const configPath = join(dest, 'shared', 'config.js');
	writeFileSync(
		configPath,
		readFileSync(configPath, 'utf8')
			.replaceAll('__API_BASE__', apiBase)
			.replaceAll('__WEB_BASE__', webBase),
	);
	writePng(join(dest, 'icons', 'icon16.png'), 16);
	writePng(join(dest, 'icons', 'icon32.png'), 32);
	writePng(join(dest, 'icons', 'icon48.png'), 48);
	writePng(join(dest, 'icons', 'icon128.png'), 128);
}

for (const target of targets) copyTarget(target);
console.log(`Built ${targets.join(', ')} → ${apiBase}`);
