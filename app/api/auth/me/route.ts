import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/session';

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: profile.user.id,
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.user.phone,
      photoUrl: profile.user.photo_url,
    },
    membership: profile.membership,
    office: profile.office,
  });
}
