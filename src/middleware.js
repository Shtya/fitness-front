
// import createMiddleware from 'next-intl/middleware';
// import { NextResponse } from 'next/server';
// import { routing } from './i18n/routing';

// const intlMiddleware = createMiddleware(routing);

// const PUBLIC_ROUTES = ['/sign-in', '/login' , "/"];

// export function middleware(request) {
//   const token = request.cookies.get('accessToken')?.value;
//   const { pathname } = request.nextUrl;

//   const locale = routing.locales.find((locale) =>
//     pathname.startsWith(`/${locale}`)
//   ) ?? routing.defaultLocale;

//   const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

//   // if (!token && !PUBLIC_ROUTES.includes(pathWithoutLocale)) {
//   //   const signInUrl = new URL(`/${locale}/sign-in`, request.url);
//   //   return NextResponse.redirect(signInUrl);
//   // }
//   return intlMiddleware(request);
// }

// export const config = {
//   matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
// };




// // import { NextResponse } from 'next/server'

// // const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

// // export async function middleware(request) {
// //   const { pathname } = request.nextUrl

// //   const protectedRoutes = ['/dashboard', '/form-submission']
// //   const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

// //   const userCookieValue = request.cookies.get('user')?.value

// //   if (!userCookieValue) {
// //     if (isProtectedRoute) {
// //       return NextResponse.redirect(new URL('/login', request.url))
// //     }

// //     // إذا كان يزور الصفحة الرئيسية `/` → إعادة التوجيه إلى /login
// //     if (pathname === '/') {
// //       return NextResponse.redirect(new URL('/login', request.url))
// //     }

// //     return NextResponse.next()
// //   }

// //   try {
// //     const user = JSON.parse(userCookieValue)

// //     if (!user.accessToken) {
// //       if (isProtectedRoute || pathname === '/') {
// //         return NextResponse.redirect(new URL('/login', request.url))
// //       }
// //       return NextResponse.next()
// //     }

// //     const { payload: decoded } = await jwtVerify(user.accessToken, JWT_SECRET)

// //     if (pathname === '/') {
// //       if (decoded.role === 'admin') {
// //         return NextResponse.redirect(new URL('/dashboard', request.url))
// //       } else if (decoded.role === 'user') {
// //         return NextResponse.redirect(new URL('/form-submission', request.url))
// //       } else {
// //         return NextResponse.redirect(new URL('/login', request.url)) // دور غير معروف
// //       }
// //     }

// //     if (pathname.startsWith('/dashboard') && decoded.role !== 'admin') {
// //       return NextResponse.redirect(new URL('/form-submission', request.url))
// //     }

// //     if (pathname.startsWith('/form-submission') && decoded.role !== 'user') {
// //       return NextResponse.redirect(new URL('/dashboard', request.url))
// //     }

// //   } catch (error) {
// //     return NextResponse.redirect(new URL('/login', request.url))
// //   }

// //   return NextResponse.next()
// // }
// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always' 
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']  
};
