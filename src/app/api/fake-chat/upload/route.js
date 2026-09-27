import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const ALLOWED = /^(image\/(jpeg|jpg|png|gif|webp|bmp|avif|heic|heif|svg\+xml)|application\/octet-stream)$/i;

function extFromMime(mime = '') {
	const m = String(mime).toLowerCase();
	if (m.includes('png')) return '.png';
	if (m.includes('webp')) return '.webp';
	if (m.includes('gif')) return '.gif';
	if (m.includes('avif')) return '.avif';
	if (m.includes('heic') || m.includes('heif')) return '.heic';
	if (m.includes('svg')) return '.svg';
	if (m.includes('bmp')) return '.bmp';
	return '.jpg';
}

/**
 * Same-origin Fake Chat image upload.
 * Saves under public/uploads/fake-chat so screenshots + preview never depend on Nest CORS.
 * Also tries forwarding to Nest /chat/upload/image when Authorization is present (shared disk).
 */
export async function POST(request) {
	try {
		const form = await request.formData();
		const file = form.get('file');
		if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
			return NextResponse.json({ message: 'No image file' }, { status: 400 });
		}

		const mime = String(file.type || 'image/png');
		if (!ALLOWED.test(mime) && !mime.startsWith('image/')) {
			return NextResponse.json({ message: `Unsupported type: ${mime}` }, { status: 415 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		if (!buffer.length) {
			return NextResponse.json({ message: 'Empty file' }, { status: 400 });
		}
		if (buffer.length > 12 * 1024 * 1024) {
			return NextResponse.json({ message: 'Image too large (max 12MB)' }, { status: 413 });
		}

		const auth = request.headers.get('authorization') || '';
		const apiOrigin = String(process.env.NEXT_PUBLIC_BASE_URL || '')
			.trim()
			.replace(/\/$/, '');

		// Prefer Nest disk when API is reachable (keeps /uploads/chat/... links).
		if (apiOrigin && auth) {
			try {
				const upstreamForm = new FormData();
				upstreamForm.append(
					'file',
					new Blob([buffer], { type: mime.startsWith('image/') ? mime : 'image/png' }),
					file.name || `paste${extFromMime(mime)}`,
				);
				const upstream = await fetch(`${apiOrigin}/api/v1/chat/upload/image`, {
					method: 'POST',
					headers: { Authorization: auth },
					body: upstreamForm,
				});
				if (upstream.ok) {
					const data = await upstream.json();
					const url = String(data?.url || '').trim();
					if (url.startsWith('/uploads/')) {
						return NextResponse.json({ url, via: 'api' });
					}
				}
			} catch {
				/* fall through to local public/ */
			}
		}

		const dir = path.join(process.cwd(), 'public', 'uploads', 'fake-chat');
		await mkdir(dir, { recursive: true });
		const name = `img-${Date.now()}-${randomBytes(4).toString('hex')}${extFromMime(mime)}`;
		await writeFile(path.join(dir, name), buffer);
		return NextResponse.json({ url: `/uploads/fake-chat/${name}`, via: 'local' });
	} catch (error) {
		return NextResponse.json(
			{ message: error?.message || 'Upload failed' },
			{ status: 500 },
		);
	}
}
