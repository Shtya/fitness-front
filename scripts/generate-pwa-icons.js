const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'icons', 'icon.svg');
const outDir = path.join(root, 'public', 'icons');
const svg = fs.readFileSync(svgPath);

async function main() {
	const jobs = [
		[16, 'favicon-16.png'],
		[32, 'favicon-32.png'],
		[48, 'icon-48.png'],
		[180, 'apple-touch-icon.png'],
		[192, 'icon-192.png'],
		[512, 'icon-512.png'],
	];

	for (const [size, name] of jobs) {
		await sharp(svg).resize(size, size).png().toFile(path.join(outDir, name));
		console.log('wrote', name);
	}

	const inset = await sharp(svg).resize(384, 384).png().toBuffer();
	await sharp({
		create: {
			width: 512,
			height: 512,
			channels: 4,
			background: { r: 139, g: 92, b: 246, alpha: 1 },
		},
	})
		.composite([{ input: inset, left: 64, top: 64 }])
		.png()
		.toFile(path.join(outDir, 'icon-512-maskable.png'));
	console.log('wrote icon-512-maskable.png');

	await sharp(svg).resize(32, 32).png().toFile(path.join(root, 'public', 'favicon-32.png'));
	console.log('done');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
