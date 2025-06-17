import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check for the auth token in cookies
  const token = request.cookies.get('auth_token')?.value
  
  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/chat/:path*", "/documents/:path*"],
} 