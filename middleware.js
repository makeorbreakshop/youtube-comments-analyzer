import { NextResponse } from 'next/server';

export function middleware(request) {
  // Add CORS headers to API responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Return response with CORS headers
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('x-middleware-cache', 'no-cache');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
} 