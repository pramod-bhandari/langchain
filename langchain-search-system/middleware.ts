import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware ensures that the NEXT_PUBLIC_API_URL is available
export function middleware(request: NextRequest) {
  // Set NEXT_PUBLIC_API_URL if it's not already set
  if (!process.env.NEXT_PUBLIC_API_URL) {
    // Get the hostname from the request
    const hostname = request.headers.get('host') || 'localhost:3000';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    
    // Set the NEXT_PUBLIC_API_URL environment variable
    process.env.NEXT_PUBLIC_API_URL = `${protocol}://${hostname}`;
    console.log('Set NEXT_PUBLIC_API_URL to:', process.env.NEXT_PUBLIC_API_URL);
  }
  
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ['/api/:path*', '/agent-search'],
}; 