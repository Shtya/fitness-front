const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
/** Canonical brand mark — same file as /logo/logo1.png in the app */
const logoPath = path.join(root, 'public', 'logo', 'logo1.png');
const outDir = path.join(root, 'public', 'icons');

async function main() {
	if (!fs.existsSync(logoPath)) {
		throw new Error(`Brand logo missing: ${logoPath}`);
	}

	const jobs = [
		[16, 'favicon-16.png'],
		[32, 'favicon-32.png'],
		[48, 'icon-48.png'],
		[180, 'apple-touch-icon.png'],
		[192, 'icon-192.png'],
		[512, 'icon-512.png'],
	];

	for (const [size, name] of jobs) {
		await sharp(logoPath)
			.resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
			.png()
			.toFile(path.join(outDir, name));
		console.log('wrote', name);
	}

	const inset = await sharp(logoPath)
		.resize(384, 384, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
		.png()
		.toBuffer();
	await sharp({
		create: {
			width: 512,
			height: 512,
			channels: 4,
			background: { r: 37, g: 99, b: 235, alpha: 1 },
		},
	})
		.composite([{ input: inset, left: 64, top: 64 }])
		.png()
		.toFile(path.join(outDir, 'icon-512-maskable.png'));
	console.log('wrote icon-512-maskable.png');

	await sharp(logoPath)
		.resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
		.png()
		.toFile(path.join(root, 'public', 'favicon-32.png'));

	/* Keep legacy /logo.png pointing at the same brand mark */
	await sharp(logoPath)
		.png()
		.toFile(path.join(root, 'public', 'logo.png'));
	console.log('wrote public/logo.png (alias of logo1)');

	console.log('done');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
