import { NextResponse } from 'next/server';
import { deleteServerPrompt, listServerPrompts, upsertServerPrompt } from '@/lib/ai-reading/server-store';

export const runtime = 'nodejs';

export async function GET() {
	try {
		const prompts = await listServerPrompts();
		return NextResponse.json({ prompts });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		if (!body.prompt) {
			return NextResponse.json({ error: 'prompt required' }, { status: 400 });
		}
		const prompt = await upsertServerPrompt(body.prompt);
		return NextResponse.json({ prompt });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request) {
	try {
		const id = new URL(request.url).searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
		await deleteServerPrompt(id);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
