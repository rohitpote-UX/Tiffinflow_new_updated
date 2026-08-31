import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { NotificationService } from '@/lib/notifications/notification-service';
import { RemindPendingSchema } from '@/lib/validators';
import { AuditService } from '@/lib/audit/audit-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = RemindPendingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { date } = parsed.data;
    const { sentCount } = await NotificationService.remindPendingUsers(session.officeId, date);

    await AuditService.log(
      session.officeId,
      'REMIND_PENDING_SENT',
      'MEAL',
      session.userId,
      date,
      { sentCount }
    );

    return NextResponse.json({
      success: true,
      sentCount,
      message: `🔔 Reminder notification sent to ${sentCount} pending employee(s).`,
    });
  } catch (err: any) {
    console.error('Remind pending error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
