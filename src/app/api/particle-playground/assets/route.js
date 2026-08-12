import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
	getAssetFolder,
	getAssetType,
	uniqueFilename,
	sanitizeFilename,
	ACCEPTED_EXTENSIONS,
	getExtension,
} from '@/lib/particle-playground/asset-utils';

export const runtime = 'nodejs';

const ROOT = path.join(process.cwd(), 'public', 'particle-assets');
const FOLDERS = ['images', 'svg', 'models'];

async function ensureDirs() {
	for (const folder of FOLDERS) {
		await fs.mkdir(path.join(ROOT, folder), { recursive: true });
	}
}

function isSafeAssetUrl(url = '') {
	return typeof url === 'string' && url.startsWith('/particle-assets/') && !url.includes('..');
}

export async function GET() {
	try {
		await ensureDirs();
		const assets = [];
		for (const folder of FOLDERS) {
			const dir = path.join(ROOT, folder);
			let entries = [];
			try {
				entries = await fs.readdir(dir);
			} catch {
				continue;
			}
			for (const filename of entries) {
				if (filename.startsWith('.')) continue;
				const ext = getExtension(filename);
				if (!ACCEPTED_EXTENSIONS.includes(ext)) continue;
				assets.push({
					name: filename.replace(ext, ''),
					filename,
					url: `/particle-assets/${folder}/${filename}`,
					type: getAssetType(filename),
					folder,
				});
			}
		}
		return NextResponse.json({ assets });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		await ensureDirs();
		const contentType = request.headers.get('content-type') || '';

		if (contentType.includes('multipart/form-data')) {
			const form = await request.formData();
			const file = form.get('file');
			if (!file || typeof file === 'string') {
				return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
			}
			const original = file.name || 'asset.png';
			const filename = uniqueFilename(original);
			const folder = getAssetFolder(filename);
			const buffer = Buffer.from(await file.arrayBuffer());
			await fs.writeFile(path.join(ROOT, folder, filename), buffer);
			return NextResponse.json({
				asset: {
					name: sanitizeFilename(original.replace(getExtension(original), '')) || filename,
					filename,
					url: `/particle-assets/${folder}/${filename}`,
					type: getAssetType(filename),
					folder,
				},
			});
		}

		const body = await request.json();
		if (body?.url) {
			const remote = body.url;
			const res = await fetch(remote);
			if (!res.ok) {
				return NextResponse.json(
					{ error: `Unable to download URL (HTTP ${res.status})` },
					{ status: 400 },
				);
			}
			const buffer = Buffer.from(await res.arrayBuffer());
			const guess =
				body.filename ||
				remote.split('?')[0].split('/').pop() ||
				`remote-${Date.now()}.png`;
			const filename = uniqueFilename(guess);
			const folder = getAssetFolder(filename);
			await fs.writeFile(path.join(ROOT, folder, filename), buffer);
			return NextResponse.json({
				asset: {
					name: sanitizeFilename(guess.replace(getExtension(guess), '')) || filename,
					filename,
					url: `/particle-assets/${folder}/${filename}`,
					type: getAssetType(filename),
					folder,
				},
			});
		}

		return NextResponse.json({ error: 'Invalid upload payload' }, { status: 400 });
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error?.message?.includes('fetch')
						? 'Unable to load image. The server may not allow cross-origin access. Try downloading the image into particle-assets instead.'
						: error.message,
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = new URL(request.url);
		const url = searchParams.get('url') || '';
		if (!isSafeAssetUrl(url)) {
			return NextResponse.json({ error: 'Invalid asset url' }, { status: 400 });
		}
		// Keep path rooted at particle-assets so file tracing does not pull
		// the entire public/ tree (uploads videos, sounds, etc.) into the
		// Vercel function bundle.
		const rel = url.replace(/^\/particle-assets\//, '');
		const abs = path.join(ROOT, ...rel.split('/').filter(Boolean));
		const normalizedRoot = path.normalize(ROOT);
		const normalizedAbs = path.normalize(abs);
		if (!normalizedAbs.startsWith(normalizedRoot)) {
			return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
		}
		await fs.unlink(normalizedAbs);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
