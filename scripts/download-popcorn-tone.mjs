import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/fake-chat/tones');
fs.mkdirSync(outDir, { recursive: true });

function get(url, redirects = 0) {
	return new Promise((resolve, reject) => {
		const lib = url.startsWith('https') ? https : http;
		const req = lib.get(
			url,
			{
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
					Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
					Referer: 'https://www.zedge.net/',
					Origin: 'https://www.zedge.net',
				},
			},
			res => {
				if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
					if (redirects > 8) return reject(new Error('too many redirects'));
					const next = new URL(res.headers.location, url).href;
					res.resume();
					return resolve(get(next, redirects + 1));
				}
				const chunks = [];
				res.on('data', c => chunks.push(c));
				res.on('end', () =>
					resolve({
						status: res.statusCode,
						headers: res.headers,
						body: Buffer.concat(chunks),
						url,
					}),
				);
			},
		);
		req.on('error', reject);
	});
}

// Fresh signed download URL from the Zedge ringtone page HTML
const page = await get('https://www.zedge.net/ringtones/780c6cd4-5848-309b-bfed-a816bf02714d');
const html = page.body.toString('utf8');
const signed = [
	...html.matchAll(/https:\/\/dw\.zobj\.net\/download\/[^"'\\\s<>]+/gi),
]
	.map(m => m[0].replace(/&amp;/g, '&'))
	.filter(u => /ios_7_popcorn|popcorn|\.mp3/i.test(u) && /special=/i.test(u));

console.log('signed', signed);

const fallbacks = [
	...signed,
	'https://btones.b-cdn.net/fetch/10/10d9b09c98b09ea9bbd843f4e4331e00.mp3',
];

for (const u of fallbacks) {
	const r = await get(u);
	const ct = String(r.headers['content-type'] || '');
	const looksAudio =
		r.status === 200 &&
		r.body.length > 5000 &&
		(/audio|mpeg|mp4|octet-stream/i.test(ct) || r.body[0] === 0xff || r.body.slice(0, 3).toString() === 'ID3');
	console.log({ status: r.status, bytes: r.body.length, ct, looksAudio, u: u.slice(0, 140) });
	if (looksAudio) {
		const out = path.join(outDir, 'popcorn.mp3');
		fs.writeFileSync(out, r.body);
		console.log('SAVED', out);
		process.exit(0);
	}
}

console.error('Could not download popcorn audio');
process.exit(1);
