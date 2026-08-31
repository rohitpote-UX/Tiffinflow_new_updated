import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { localDb } from '@/lib/db';
import { z } from 'zod';

const UpdatePreferenceSchema = z.object({
  defaultPreference: z.enum(['flexible', 'always-veg', 'always-non-veg']),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdatePreferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { defaultPreference } = parsed.data;

    const membership = localDb.memberships.find(
      (m) => m.user_id === session.userId && m.office_id === session.officeId && m.is_active
    );

    if (!membership) {
      return NextResponse.json({ error: 'Active office membership not found' }, { status: 404 });
    }

    membership.default_preference = defaultPreference;
    membership.updated_at = new Date().toISOString();
    localDb.save();

    return NextResponse.json({
      success: true,
      message: 'Dietary preference updated successfully',
      defaultPreference,
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
