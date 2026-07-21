import { NextResponse, type NextRequest } from 'next/server'

// UX-layer redirect only. The security boundary is requireAdmin() inside every
// admin server entry — this just avoids a flash of the dashboard shell.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!request.cookies.get('admin_session')?.value) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
}
