import { NextResponse } from 'next/server';

export function middleware(request) {
  // Add response headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  // Only run middleware on API routes
  matcher: ['/api/:path*'],
} 