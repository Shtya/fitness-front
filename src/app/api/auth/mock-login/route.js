import { NextResponse } from 'next/server';
 
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = body?.token || 'dummy-token';
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}


// import { cookies } from 'next/headers';
// import { NextResponse } from 'next/server';

// export async function POST(req) {
//   const { accessToken } = await req.json();

//   if (!accessToken) {
//     return NextResponse.json({ error: 'Missing token' }, { status: 400 });
//   }

//   const cookieStore = await cookies(); // ✅ Await here
//   cookieStore.set('accessToken', accessToken, {
//     httpOnly: true,
//     path: '/',
//   });

//   return NextResponse.json({ success: true });
// }

