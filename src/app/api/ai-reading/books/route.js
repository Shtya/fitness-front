import { NextResponse } from 'next/server';
import { deleteServerBook, listServerBooks, upsertServerBook } from '@/lib/ai-reading/server-store';

export const runtime = 'nodejs';

export async function GET() {
	try {
		const books = await listServerBooks();
		return NextResponse.json({ books });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		if (!body.book?.id) {
			return NextResponse.json({ error: 'book with id required' }, { status: 400 });
		}
		const book = await upsertServerBook(body.book);
		return NextResponse.json({ book });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request) {
	try {
		const id = new URL(request.url).searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
		await deleteServerBook(id);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
