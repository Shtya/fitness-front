import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { sanitizeFilename } from '@/lib/particle-playground/asset-utils';

export const runtime = 'nodejs';

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'particle-assets', 'sessions');

async function ensureDir() {
	await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

function toFilename(idOrName) {
	const base = sanitizeFilename(String(idOrName || 'session')).replace(/\.json$/i, '');
	return `${base}.json`;
}

function isSafeFilename(filename) {
	return (
		typeof filename === 'string' &&
		filename.endsWith('.json') &&
		!filename.includes('..') &&
		!filename.includes('/') &&
		!filename.includes('\\')
	);
}

export async function GET(request) {
	try {
		await ensureDir();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (id) {
			const filename = toFilename(id);
			const raw = await fs.readFile(path.join(SESSIONS_DIR, filename), 'utf8');
			const session = JSON.parse(raw);
			return NextResponse.json({ session, filename });
		}

		const entries = await fs.readdir(SESSIONS_DIR);
		const sessions = [];
		for (const filename of entries) {
			if (!filename.endsWith('.json')) continue;
			try {
				const raw = await fs.readFile(path.join(SESSIONS_DIR, filename), 'utf8');
				const data = JSON.parse(raw);
				sessions.push({
					filename,
					id: data.id || filename.replace(/\.json$/, ''),
					name: data.name || filename,
					createdAt: data.createdAt || null,
					updatedAt: data.updatedAt || data.savedAt || null,
					assetCount: Array.isArray(data.assets) ? data.assets.length : 0,
					historyCount: Array.isArray(data.history) ? data.history.length : 0,
					selectedId: data.selectedId || null,
				});
			} catch {
				/* skip */
			}
		}

		sessions.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
		return NextResponse.json({ sessions });
	} catch (error) {
		if (error?.code === 'ENOENT') {
			return NextResponse.json({ sessions: [] });
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		await ensureDir();
		const body = await request.json();
		const id = body.id || `sess-${Date.now().toString(36)}`;
		const filename = body.filename ? toFilename(body.filename) : toFilename(id);
		const payload = {
			...body,
			id,
			name: body.name || 'Untitled Session',
			updatedAt: new Date().toISOString(),
			createdAt: body.createdAt || new Date().toISOString(),
		};
		await fs.writeFile(
			path.join(SESSIONS_DIR, filename),
			JSON.stringify(payload, null, 2),
			'utf8',
		);
		return NextResponse.json({ ok: true, filename, session: payload });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id') || '';
		const filename = searchParams.get('filename') || toFilename(id);
		if (!isSafeFilename(filename)) {
			return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
		}
		await fs.unlink(path.join(SESSIONS_DIR, filename));
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
