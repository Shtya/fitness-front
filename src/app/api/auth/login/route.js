import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { user } = await req.json();

    if (!user) {
      return NextResponse.json({ message: 'Missing user' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true, user });

    // Cookie expires in 1 week (7 days)
    const oneWeek = 60 * 60 * 24 * 7;

    res.cookies.set('user', JSON.stringify(user), {
      httpOnly: false, // keep false if you need to read it in client JS
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
