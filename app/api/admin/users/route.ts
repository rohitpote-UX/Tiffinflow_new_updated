import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { OfficeService } from '@/lib/offices/office-service';
import { localDb } from '@/lib/db';
import { AuditService } from '@/lib/audit/audit-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const members = await OfficeService.getOfficeMembers(session.officeId);
    return NextResponse.json({
      success: true,
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        role: m.membership.role,
        defaultPreference: m.membership.default_preference,
        isActive: m.membership.is_active,
        joinedAt: m.membership.joined_at,
      })),
    });
  } catch (err: any) {
    console.error('Users fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const membership = localDb.memberships.find(
      (m) => m.user_id === userId && m.office_id === session.officeId
    );

    if (membership) {
      membership.is_active = false;
      membership.updated_at = new Date().toISOString();
      localDb.save();

      await AuditService.log(
        session.officeId,
        'USER_DEACTIVATED',
        'USER',
        session.userId,
        userId
      );
    }

    return NextResponse.json({ success: true, message: 'User deactivated from office' });
  } catch (err: any) {
    console.error('User delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
