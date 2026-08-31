import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { OfficeService } from '@/lib/offices/office-service';
import { AuditService } from '@/lib/audit/audit-service';
import { realtimeBus } from '@/lib/realtime/realtime-service';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const { date } = await req.json();
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const snapshot = await OfficeService.finalizeOrder(session.officeId, date, session.userId);

    await AuditService.log(
      session.officeId,
      'ORDER_FINALIZED',
      'OFFICE',
      session.userId,
      date,
      {
        vegCount: snapshot.veg_count,
        nonVegCount: snapshot.non_veg_count,
        totalMeals: snapshot.total_meals,
        totalRevenue: snapshot.total_revenue,
      }
    );

    // Broadcast realtime event
    realtimeBus.broadcast(session.officeId, 'ORDER_FINALIZED', {
      date,
      totalMeals: snapshot.total_meals,
      totalRevenue: snapshot.total_revenue,
      vegCount: snapshot.veg_count,
      nonVegCount: snapshot.non_veg_count,
    });

    return NextResponse.json({
      success: true,
      snapshot,
      message: `✓ Lunch order finalized for ${date}! (${snapshot.total_meals} total meals)`,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Finalize order error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
