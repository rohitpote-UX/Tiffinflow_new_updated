import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/session';

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.user || !profile.membership || !profile.membership.is_active) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const role = profile.membership.role as 'ADMIN' | 'USER';
  const redirectUrl = role === 'ADMIN' ? '/admin' : '/app';

  return NextResponse.json({
    authenticated: true,
    role,
    redirectUrl,
    user: {
      id: profile.user.id,
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.user.phone,
      photoUrl: profile.user.photo_url,
      role,
      officeId: profile.office?.id || profile.membership.office_id,
      officeName: profile.office?.name || 'Office Workspace',
    },
    membership: profile.membership,
    office: profile.office,
  });
}
