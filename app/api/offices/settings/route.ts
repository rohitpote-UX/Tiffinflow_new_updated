import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth/session';
import { OfficeService } from '@/lib/offices/office-service';
import { OfficeSettingsSchema } from '@/lib/validators';
import { AuditService } from '@/lib/audit/audit-service';
import { realtimeBus } from '@/lib/realtime/realtime-service';
import { NotificationService } from '@/lib/notifications/notification-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const office = await OfficeService.getOfficeById(session.officeId);
    if (!office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      office: {
        id: office.id,
        name: office.name,
        adminId: office.admin_id,
        vegPrice: office.veg_price,
        nonVegPrice: office.non_veg_price,
        cutoffTime: office.cutoff_time,
        timezone: office.timezone,
        weekStartDay: office.week_start_day,
        autoDefaultEnabled: office.auto_default_enabled,
        joinCode: office.join_code,
        workingDays: office.working_days,
      },
    });
  } catch (err: any) {
    console.error('Office settings get error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const parsed = OfficeSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updates = parsed.data;
    const oldOffice = await OfficeService.getOfficeById(session.officeId);

    const office = await OfficeService.updateSettings(session.officeId, {
      name: updates.name,
      veg_price: updates.vegPrice,
      non_veg_price: updates.nonVegPrice,
      cutoff_time: updates.cutoffTime,
      auto_default_enabled: updates.autoDefaultEnabled,
      working_days: updates.workingDays,
      timezone: updates.timezone,
    });

    await AuditService.log(
      session.officeId,
      'OFFICE_SETTINGS_UPDATED',
      'OFFICE',
      session.userId,
      session.officeId,
      updates
    );

    // Broadcast real-time events
    if (oldOffice && (oldOffice.veg_price !== updates.vegPrice || oldOffice.non_veg_price !== updates.nonVegPrice)) {
      realtimeBus.broadcast(session.officeId, 'PRICE_UPDATED', {
        vegPrice: updates.vegPrice,
        nonVegPrice: updates.nonVegPrice,
      });
      NotificationService.notifyPriceChange(session.officeId, updates.vegPrice, updates.nonVegPrice).catch(console.warn);
    }

    if (oldOffice && oldOffice.cutoff_time !== updates.cutoffTime) {
      realtimeBus.broadcast(session.officeId, 'CUTOFF_UPDATED', {
        cutoffTime: updates.cutoffTime,
      });
    }

    if (oldOffice && JSON.stringify(oldOffice.working_days) !== JSON.stringify(updates.workingDays)) {
      realtimeBus.broadcast(session.officeId, 'WORKING_DAYS_UPDATED', {
        workingDays: updates.workingDays,
      });
    }

    return NextResponse.json({
      success: true,
      message: '✓ Office settings updated successfully!',
      office,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Office settings update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
