import { NextResponse } from 'next/server';

/**
 * Same-origin proxy for Fake Chat /uploads images so html-to-image can paint them
 * (cross-origin API host otherwise blanks avatars in screenshots).
 */
export async function GET(request) {
	const src = String(request.nextUrl.searchParams.get('src') || '').trim();
	if (!src.startsWith('/uploads/')) {
		return NextResponse.json({ message: 'Invalid src' }, { status: 400 });
	}

	const apiOrigin = String(process.env.NEXT_PUBLIC_BASE_URL || '')
		.trim()
		.replace(/\/$/, '');
	if (!apiOrigin) {
		return NextResponse.json({ message: 'API origin not configured' }, { status: 500 });
	}

	try {
		const upstream = await fetch(`${apiOrigin}${src}`, {
			cache: 'force-cache',
			headers: { Accept: 'image/*' },
		});
		if (!upstream.ok) {
			return NextResponse.json({ message: 'Upstream failed' }, { status: upstream.status });
		}
		const contentType = upstream.headers.get('content-type') || 'image/jpeg';
		if (!contentType.startsWith('image/')) {
			return NextResponse.json({ message: 'Not an image' }, { status: 415 });
		}
		const buffer = await upstream.arrayBuffer();
		return new NextResponse(buffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=86400',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch {
		return NextResponse.json({ message: 'Proxy failed' }, { status: 502 });
	}
}
