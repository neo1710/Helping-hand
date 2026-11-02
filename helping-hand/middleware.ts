import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function middleware(request: NextRequest) {
  const isAuth0Configured =
    Boolean(process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL) &&
    !process.env.AUTH0_DOMAIN?.includes('YOUR_AUTH0_DOMAIN') &&
    !process.env.AUTH0_ISSUER_BASE_URL?.includes('YOUR_AUTH0_DOMAIN');

  // Let API routes pass directly to route handlers
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // If Auth0 auth endpoints (/auth/login, etc.) are visited before real credentials are added,
  // guide the user back instead of crashing with DNS ENOTFOUND
  if (request.nextUrl.pathname.startsWith('/auth/') && !isAuth0Configured) {
    const homeUrl = new URL('/', request.url);
    homeUrl.searchParams.set('auth_warning', 'Please add your Auth0 domain and client ID in .env.local');
    return NextResponse.redirect(homeUrl);
  }

  try {
    return await auth0.middleware(request);
  } catch (error) {
    console.warn('Middleware Auth0 warning:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
