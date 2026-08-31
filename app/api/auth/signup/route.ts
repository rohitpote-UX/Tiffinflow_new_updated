import { NextRequest, NextResponse } from 'next/server';
import { localDb, User, Membership, Office } from '@/lib/db';
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { SignupSchema } from '@/lib/validators';
import { OfficeService } from '@/lib/offices/office-service';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, phone, password, role = 'ADMIN', officeName, officeCodeOrName, defaultPreference } = parsed.data;

    // Check existing email
    const existing = localDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'This email is already registered. Please log in.' }, { status: 400 });
    }

    const userId = crypto.randomUUID();
    const pwdHash = await hashPassword(password);
    const now = new Date().toISOString();

    let targetOfficeId: string;
    let resolvedOfficeName: string;

    const officeInput = (officeName || officeCodeOrName || 'My Office Workspace').trim();

    if (role === 'ADMIN') {
      // Create new Office
      targetOfficeId = crypto.randomUUID();
      resolvedOfficeName = officeInput;
      const joinCode = OfficeService.generateJoinCode('BITE');

      const newOffice: Office = {
        id: targetOfficeId,
        name: resolvedOfficeName,
        admin_id: userId,
        veg_price: 80,
        non_veg_price: 100,
        cutoff_time: '19:00',
        timezone: 'Asia/Kolkata',
        week_start_day: 1,
        auto_default_enabled: true,
        join_code: joinCode,
        working_days: [1, 2, 3, 4, 5],
        created_at: now,
        updated_at: now,
      };

      localDb.offices.push(newOffice);
    } else {
      // Find office by join code
      const office = await OfficeService.getOfficeByJoinCode(officeInput);
      if (!office) {
        return NextResponse.json(
          { error: `No office found with join code: "${officeInput.toUpperCase()}". Please verify code with your admin.` },
          { status: 404 }
        );
      }
      targetOfficeId = office.id;
      resolvedOfficeName = office.name;
    }

    // Create User record
    const newUser: User = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password_hash: pwdHash,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    localDb.users.push(newUser);

    // Create Membership record
    const newMembership: Membership = {
      id: crypto.randomUUID(),
      user_id: userId,
      office_id: targetOfficeId,
      role: role as 'ADMIN' | 'USER',
      default_preference: defaultPreference,
      is_active: true,
      joined_at: now,
      updated_at: now,
    };
    localDb.memberships.push(newMembership);
    localDb.save();

    const redirectUrl = role === 'ADMIN' ? '/admin' : '/app';

    // Generate Session Token
    const token = await createSessionToken({
      userId,
      email: newUser.email,
      name: newUser.name,
      role: role as 'ADMIN' | 'USER',
      officeId: targetOfficeId,
      officeName: resolvedOfficeName,
    });

    const res = NextResponse.json({
      success: true,
      role,
      redirectUrl,
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role,
        officeId: targetOfficeId,
        officeName: resolvedOfficeName,
      },
      membership: {
        id: newMembership.id,
        role: newMembership.role,
        defaultPreference: newMembership.default_preference,
        isActive: newMembership.is_active,
      },
      office: {
        id: targetOfficeId,
        name: resolvedOfficeName,
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
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
