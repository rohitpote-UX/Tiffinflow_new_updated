import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { LoginSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = localDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Find active membership
    const membership = localDb.memberships.find((m) => m.user_id === user.id && m.is_active);
    if (!membership) {
      return NextResponse.json({ error: 'No active office membership found for this user.' }, { status: 403 });
    }

    const office = localDb.offices.find((o) => o.id === membership.office_id);
    const officeName = office?.name || 'Office';

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: membership.role as 'ADMIN' | 'USER',
      officeId: membership.office_id,
      officeName,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: membership.role,
        officeId: membership.office_id,
        officeName,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
