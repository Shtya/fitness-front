import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serves the ParticleObject engine source so the playground can
 * package a ready-to-drop animation (copy / download).
 */
export async function GET() {
	try {
		const filePath = path.join(
			process.cwd(),
			'src',
			'components',
			'canvasui',
			'ParticleObject.jsx',
		);
		const source = await fs.readFile(filePath, 'utf8');
		return new NextResponse(source, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-store',
				'Content-Disposition': 'inline; filename="ParticleObject.jsx"',
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ error: error.message || 'Unable to read ParticleObject.jsx' },
			{ status: 500 },
		);
	}
}
