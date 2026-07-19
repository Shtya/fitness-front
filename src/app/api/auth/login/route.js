import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ message: 'Missing access token' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!backendUrl) {
      return NextResponse.json({ message: 'Authentication service is unavailable' }, { status: 503 });
    }
    const verify = await fetch(`${backendUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!verify.ok) {
      return NextResponse.json({ message: 'Invalid session' }, { status: 401 });
    }
    const verifiedUser = await verify.json();
    if (!verifiedUser?.id || !verifiedUser?.role) {
      return NextResponse.json({ message: 'Invalid user session' }, { status: 401 });
    }

    const cookieUser = { id: verifiedUser.id, role: verifiedUser.role };
    const res = NextResponse.json({ ok: true, user: cookieUser });
    const oneWeek = 60 * 60 * 24 * 7;

    res.cookies.set('user', JSON.stringify(cookieUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: oneWeek,
    });

    return res;
  } catch (err) {
    console.error('Error setting cookie:', err);
    return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
  }
}
