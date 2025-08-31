// import { cookies } from 'next/headers';
// import { NextResponse } from 'next/server';

// export async function POST() {
//     cookies().delete('accessToken');

//     return NextResponse.json({ success: true });
// }

import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', '', { httpOnly: true, expires: new Date(0), path: '/' });
  return res;
}
