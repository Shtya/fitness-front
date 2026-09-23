import { NextResponse } from 'next/server';
import { deleteServerBook, listServerBooks, upsertServerBook } from '@/lib/ai-reading/server-store';

export const runtime = 'nodejs';

export async function GET() {
	try {
		const books = await listServerBooks();
		return NextResponse.json({ books });
	} catch (error) {
		return NextResponse.json({ books: [], warning: error.message });
	}
}

export async function POST(request) {
	let body = {};
	try {
		body = await request.json();
		if (!body.book?.id) {
			return NextResponse.json({ error: 'book with id required' }, { status: 400 });
		}
		const book = await upsertServerBook(body.book);
		return NextResponse.json({ book });
	} catch (error) {
		/* Client localStorage is source of truth — never block the library sync */
		if (body?.book?.id) {
			return NextResponse.json({
				book: { ...body.book, updatedAt: new Date().toISOString() },
				persisted: false,
				warning: error.message,
			});
		}
		return NextResponse.json({ error: error.message || 'Save failed' }, { status: 500 });
	}
}

export async function DELETE(request) {
	try {
		const id = new URL(request.url).searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
		await deleteServerBook(id);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json({ ok: true, warning: error.message });
	}
}
