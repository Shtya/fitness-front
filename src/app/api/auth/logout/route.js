import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });

    // Delete the user cookie
    res.cookies.set('user', '', {
      path: '/',
      maxAge: 0, 
    });

    return res;
  } catch (err) {
    console.error('Error clearing user cookie:', err);
    return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
  }
}
