import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { LoginSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Please enter a valid email and password.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // Query user by normalized email
    const user = localDb.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'This account has been deactivated. Please contact your office administrator.' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }

    // Find active office membership
    const membership = localDb.memberships.find((m) => m.user_id === user.id && m.is_active);
    if (!membership) {
      return NextResponse.json(
        { error: 'No active workspace membership found for this account. Please join a workspace.' },
        { status: 403 }
      );
    }

    const office = localDb.offices.find((o) => o.id === membership.office_id);
    const officeName = office?.name || 'Office Workspace';
    const role = membership.role as 'ADMIN' | 'USER';
    const redirectUrl = role === 'ADMIN' ? '/admin' : '/app';

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role,
      officeId: membership.office_id,
      officeName,
    });

    const res = NextResponse.json({
      success: true,
      role,
      redirectUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role,
        officeId: membership.office_id,
        officeName,
      },
      membership: {
        id: membership.id,
        role: membership.role,
        defaultPreference: membership.default_preference,
        isActive: membership.is_active,
      },
      office: {
        id: office?.id || membership.office_id,
        name: officeName,
      },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return res;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
