import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { MealService } from '@/lib/meals/meal-service';
import { NotificationService } from '@/lib/notifications/notification-service';
import { AuditService } from '@/lib/audit/audit-service';
import { EmergencyCancelSchema } from '@/lib/validators';
import { realtimeBus } from '@/lib/realtime/realtime-service';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const parsed = EmergencyCancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { date, reason } = parsed.data;

    const { cancelledCount } = await MealService.cancelOfficeMealsForDate(session.officeId, date, reason);

    await AuditService.log(
      session.officeId,
      'EMERGENCY_MEAL_CANCELLED',
      'MEAL',
      session.userId,
      date,
      { cancelledCount, reason }
    );

    // Broadcast realtime event
    realtimeBus.broadcast(session.officeId, 'MEAL_CANCELLED', {
      date,
      reason,
      cancelledCount,
    });

    // Notify office members
    await NotificationService.notifyEmergencyCancellation(session.officeId, date, reason);

    return NextResponse.json({
      success: true,
      cancelledCount,
      message: `Lunch for ${date} has been cancelled (${cancelledCount} meal(s) updated). Members notified.`,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Cancel meal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
