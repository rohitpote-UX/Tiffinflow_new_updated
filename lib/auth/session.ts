/**
 * Authentication and Session Management for BiteBuddy 2.0
 * Uses bcryptjs for password hashing and jose for lightweight JWT session tokens
 */

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { localDb, User, Membership, Office } from '../db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'bitebuddy-super-secret-jwt-key-minimum-32-chars-length'
);

export const COOKIE_NAME = process.env.COOKIE_NAME || 'bitebuddy_session';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  officeId: string;
  officeName: string;
}

/**
 * Hash password securely with bcrypt salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create encrypted JWT session token
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

/**
 * Verify and decode JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Get current session from Next.js cookies (Server Components / Route Handlers)
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const session = await verifySessionToken(token);
    if (!session) return null;

    // Verify user is still active in database
    const user = localDb.users.find((u) => u.id === session.userId);
    if (!user || !user.is_active) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Server-side authorization check: Require valid authenticated session
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

/**
 * Server-side authorization check: Require Admin role (verified against live database membership)
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();

  // Strict live database authorization verification
  const membership = localDb.memberships.find(
    (m) => m.user_id === session.userId && m.office_id === session.officeId && m.is_active
  );

  if (!membership || membership.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }

  return session;
}

/**
 * Helper to fetch complete user, membership, and office profile for the active session
 */
export async function getCurrentUserProfile(): Promise<{
  user: User | null;
  membership: Membership | null;
  office: Office | null;
} | null> {
  const session = await getSession();
  if (!session) return null;

  const user = localDb.users.find((u) => u.id === session.userId) || null;
  const membership =
    localDb.memberships.find(
      (m) => m.user_id === session.userId && m.office_id === session.officeId
    ) || null;
  const office = localDb.offices.find((o) => o.id === session.officeId) || null;

  return { user, membership, office };
}
