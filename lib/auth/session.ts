/**
 * Authentication and Session Management for BiteBuddy 2.0
 * Uses bcryptjs for password hashing and jose for lightweight JWT session tokens
 * 
 * Provides unified, single source of truth for user identification,
 * role authorization, and office membership verification.
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

export interface CurrentUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'USER';
  officeId: string;
  officeName: string;
  isActive: boolean;
  defaultPreference?: 'flexible' | 'always-veg' | 'always-non-veg';
}

/**
 * Hash password securely with bcrypt salt (10 rounds)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against stored hash with timing attack resistance
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create encrypted JWT session token (30 days validity)
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
 * Get current session token payload from Next.js cookies
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
 * Get the fully verified, live database identity of the authenticated user
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = localDb.users.find((u) => u.id === session.userId);
  if (!user || !user.is_active) return null;

  const membership = localDb.memberships.find(
    (m) => m.user_id === session.userId && m.office_id === session.officeId && m.is_active
  );
  if (!membership) return null;

  const office = localDb.offices.find((o) => o.id === session.officeId);
  const officeName = office?.name || session.officeName || 'Office Workspace';

  return {
    id: user.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: membership.role as 'ADMIN' | 'USER',
    officeId: membership.office_id,
    officeName,
    isActive: user.is_active && membership.is_active,
    defaultPreference: membership.default_preference,
  };
}

/**
 * Server-side authorization guard: Require valid active authenticated user
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Server-side authorization guard: Require Admin role verified against live database membership
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Server-side authorization guard: Require Employee (USER) role
 */
export async function requireEmployee(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (user.role !== 'USER' && user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Helper to fetch complete composite user, membership, and office profile
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
