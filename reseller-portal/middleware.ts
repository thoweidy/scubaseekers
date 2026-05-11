import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('reseller_session');
  const isPortalRoute = request.nextUrl.pathname.startsWith('/portal');

  if (isPortalRoute && !session) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*'],
};
