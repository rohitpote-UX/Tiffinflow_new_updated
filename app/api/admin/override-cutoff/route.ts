import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { OfficeService } from '@/lib/offices/office-service';
import { NotificationService } from '@/lib/notifications/notification-service';
import { AuditService } from '@/lib/audit/audit-service';
import { CutoffOverrideSchema } from '@/lib/validators';
import { realtimeBus } from '@/lib/realtime/realtime-service';
import { formatTime12h } from '@/lib/utils/dates';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const parsed = CutoffOverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { newCutoffTime, reason } = parsed.data;

    await OfficeService.updateSettings(session.officeId, {
      cutoff_time: newCutoffTime,
    });

    await AuditService.log(
      session.officeId,
      'CUTOFF_EXTENDED',
      'OFFICE',
      session.userId,
      session.officeId,
      { newCutoffTime, reason }
    );

    // Broadcast realtime event
    realtimeBus.broadcast(session.officeId, 'CUTOFF_UPDATED', {
      cutoffTime: newCutoffTime,
      formattedCutoffTime: formatTime12h(newCutoffTime),
      reason,
    });

    // Notify office members
    await NotificationService.notifyCutoffExtended(session.officeId, newCutoffTime);

    const formattedTime = formatTime12h(newCutoffTime);
    return NextResponse.json({
      success: true,
      message: `Cutoff time extended to ${formattedTime}. Members notified.`,
      newCutoffTime,
      formattedTime,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Cutoff override error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
