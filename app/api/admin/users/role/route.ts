import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { OfficeService } from '@/lib/offices/office-service';
import { realtimeBus } from '@/lib/realtime/realtime-service';
import { z } from 'zod';

const UpdateRoleSchema = z.object({
  userId: z.string().min(1, 'Target user ID is required'),
  role: z.enum(['ADMIN', 'USER']),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { userId, role } = parsed.data;

    let result;
    if (role === 'ADMIN') {
      result = await OfficeService.promoteMemberToAdmin(session.officeId, session.userId, userId);
    } else {
      result = await OfficeService.demoteAdminToUser(session.officeId, session.userId, userId);
    }

    // Broadcast real-time event
    realtimeBus.broadcast(session.officeId, 'MEMBER_ROLE_CHANGED', {
      userId,
      role,
      userName: result.user.name,
    });

    return NextResponse.json({
      success: true,
      message: `✓ Successfully updated role for ${result.user.name} to ${role}`,
      member: {
        id: result.user.id,
        name: result.user.name,
        role: result.membership.role,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Role update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update role' }, { status: 400 });
  }
}
