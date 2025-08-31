import { NextResponse } from 'next/server';

// Mock sending OTP. In real life, send email/SMS here.
export async function POST(request) {
  const { email } = await request.json().catch(() => ({}));
  if (!email) return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });

  // Store a mock OTP in a non-HttpOnly cookie just for demo (not secure).
  // In production you'd store server-side (DB/Redis) against a nonce.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(`otp_${encodeURIComponent(email)}`, '123456', { path: '/', maxAge: 300 });
  return res;
}
