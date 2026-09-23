import { NextResponse } from 'next/server';
import { getServerPrefs, saveServerPrefs } from '@/lib/ai-reading/server-store';

export const runtime = 'nodejs';

export async function GET() {
	try {
		const prefs = await getServerPrefs();
		return NextResponse.json({ prefs: prefs || null });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'prefs object required' }, { status: 400 });
		}
		const { updatedAt: _u, ...rest } = body.prefs || body;
		const prefs = await saveServerPrefs(rest);
		return NextResponse.json({ prefs });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
