import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'bitebuddy-super-secret-jwt-key-minimum-32-chars-length'
);

const COOKIE_NAME = process.env.COOKIE_NAME || 'bitebuddy_session';

interface DecodedSession {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  officeId: string;
  officeName: string;
}

async function verifyToken(token: string): Promise<DecodedSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as DecodedSession;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read session cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isEmployeeRoute = pathname === '/app' || pathname.startsWith('/app/');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isRootRoute = pathname === '/';

  // 1. Protect Admin Routes (/admin/*)
  if (isAdminRoute) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== 'ADMIN') {
      // Non-admin attempting to access admin route -> redirect safely to employee dashboard
      return NextResponse.redirect(new URL('/app', req.url));
    }

    return NextResponse.next();
  }

  // 2. Protect Employee Routes (/app/*)
  if (isEmployeeRoute) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 3. Auth Routes (/login, /signup) & Root (/)
  if (isAuthRoute) {
    if (session) {
      if (session.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else {
        return NextResponse.redirect(new URL('/app', req.url));
      }
    }
    return NextResponse.next();
  }

  if (isRootRoute) {
    if (session) {
      if (session.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url));
      } else {
        return NextResponse.redirect(new URL('/app', req.url));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/admin/:path*',
    '/app/:path*',
  ],
};
