import { NextRequest, NextResponse } from 'next/server';
import { OfficeService } from '@/lib/offices/office-service';
import { JoinOfficeSchema } from '@/lib/validators';
import { localDb, User, Membership } from '@/lib/db';
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth/session';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }

  const office = await OfficeService.getOfficeByJoinCode(code);
  if (!office) {
    return NextResponse.json({ error: 'Invalid join code. Office not found.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    office: {
      id: office.id,
      name: office.name,
      joinCode: office.join_code,
      vegPrice: office.veg_price,
      nonVegPrice: office.non_veg_price,
      cutoffTime: office.cutoff_time,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = JoinOfficeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { joinCode, name, email, phone, password, defaultPreference } = parsed.data;

    const office = await OfficeService.getOfficeByJoinCode(joinCode);
    if (!office) {
      return NextResponse.json({ error: 'Invalid join code. Office not found.' }, { status: 404 });
    }

    let user = localDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const now = new Date().toISOString();

    if (user) {
      // Check existing membership
      const existingMem = localDb.memberships.find(
        (m) => m.user_id === user!.id && m.office_id === office.id
      );
      if (existingMem) {
        if (!existingMem.is_active) {
          existingMem.is_active = true;
          existingMem.updated_at = now;
        }
      } else {
        const newMem: Membership = {
          id: crypto.randomUUID(),
          user_id: user.id,
          office_id: office.id,
          role: 'USER',
          default_preference: defaultPreference,
          is_active: true,
          joined_at: now,
          updated_at: now,
        };
        localDb.memberships.push(newMem);
      }
    } else {
      const userId = crypto.randomUUID();
      const pwdHash = await hashPassword(password);
      user = {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password_hash: pwdHash,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      localDb.users.push(user);

      const newMem: Membership = {
        id: crypto.randomUUID(),
        user_id: userId,
        office_id: office.id,
        role: 'USER',
        default_preference: defaultPreference,
        is_active: true,
        joined_at: now,
        updated_at: now,
      };
      localDb.memberships.push(newMem);
    }

    localDb.save();

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'USER',
      officeId: office.id,
      officeName: office.name,
    });

    const res = NextResponse.json({
      success: true,
      message: `✓ Joined ${office.name} successfully!`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'USER',
        officeId: office.id,
        officeName: office.name,
      },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err: any) {
    console.error('Join office error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
