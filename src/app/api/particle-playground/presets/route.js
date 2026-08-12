import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { sanitizeFilename } from '@/lib/particle-playground/asset-utils';

export const runtime = 'nodejs';

const PRESETS_DIR = path.join(process.cwd(), 'public', 'particle-assets', 'presets');

async function ensureDir() {
	await fs.mkdir(PRESETS_DIR, { recursive: true });
}

function toFilename(name) {
	const base = sanitizeFilename(name || 'scene').replace(/\.json$/i, '');
	return `${base}.json`;
}

export async function GET() {
	try {
		await ensureDir();
		const entries = await fs.readdir(PRESETS_DIR);
		const presets = [];
		for (const filename of entries) {
			if (!filename.endsWith('.json')) continue;
			try {
				const raw = await fs.readFile(path.join(PRESETS_DIR, filename), 'utf8');
				const data = JSON.parse(raw);
				presets.push({ filename, ...data });
			} catch {
				/* skip corrupt */
			}
		}
		return NextResponse.json({ presets });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		await ensureDir();
		const body = await request.json();
		const name = body.name || 'Untitled Scene';
		const filename = body.filename ? toFilename(body.filename) : toFilename(name);
		const payload = {
			...body,
			name,
			savedAt: new Date().toISOString(),
		};
		await fs.writeFile(
			path.join(PRESETS_DIR, filename),
			JSON.stringify(payload, null, 2),
			'utf8',
		);
		return NextResponse.json({ ok: true, filename, preset: payload });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = new URL(request.url);
		const filename = searchParams.get('filename') || '';
		if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
			return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
		}
		await fs.unlink(path.join(PRESETS_DIR, filename));
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
