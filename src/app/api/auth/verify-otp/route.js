import { NextResponse } from 'next/server';

// Verify the mocked OTP.
export async function POST(request) {
  const { email, code } = await request.json().catch(() => ({}));
  if (!email || !code) return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });

  // Read cookie set by send-otp
  const cookieName = `otp_${encodeURIComponent(email)}`;
  const cookieStore = request.cookies; // Note: in edge runtimes, use cookies() helper
  const cookie = cookieStore.get(cookieName);

  if (!cookie || cookie.value !== '123456' || code !== '123456') {
    return NextResponse.json({ ok: false, error: 'Invalid code' }, { status: 400 });
  }

  // Clear the OTP cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, '', { expires: new Date(0), path: '/' });
  return res;
}
