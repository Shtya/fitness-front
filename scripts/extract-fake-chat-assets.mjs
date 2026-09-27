import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(
	process.env.USERPROFILE || '',
	'.cursor/projects/e-env-Me-So7baFit/assets',
	'c__Users_Ahmed_AppData_Roaming_Cursor_User_workspaceStorage_75b6949a8154342ab2b30a7b8f91cc2f_images_image-cca46de3-3091-496e-a8be-259886a0a62d.png',
);
const outDir = path.join(__dirname, '../public/fake-chat');
fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(src).metadata();
const w = meta.width;
const h = meta.height;

const strip = await sharp(src)
	.extract({
		left: 4,
		top: Math.floor(h * 0.16),
		width: 28,
		height: Math.floor(h * 0.55),
	})
	.png()
	.toBuffer();

const resized = await sharp(strip).resize(70, 280, { fit: 'fill' }).png().toBuffer();

await sharp({
	create: { width: 280, height: 280, channels: 3, background: '#e5ddd5' },
})
	.composite([
		{ input: resized, left: 0, top: 0 },
		{ input: resized, left: 70, top: 0 },
		{ input: resized, left: 140, top: 0 },
		{ input: resized, left: 210, top: 0 },
	])
	.png()
	.toFile(path.join(outDir, 'wallpaper-tile.png'));

const av = 56;
const avatarRaw = await sharp(src)
	.extract({
		left: Math.floor(w * 0.168),
		top: Math.floor(h * 0.058),
		width: av,
		height: av,
	})
	.resize(152, 152)
	.png()
	.toBuffer();

const circle = Buffer.from(
	'<svg width="152" height="152"><circle cx="76" cy="76" r="76" fill="white"/></svg>',
);

await sharp(avatarRaw)
	.composite([{ input: circle, blend: 'dest-in' }])
	.png()
	.toFile(path.join(outDir, 'avatar-nour.png'));

console.log('updated', outDir);
