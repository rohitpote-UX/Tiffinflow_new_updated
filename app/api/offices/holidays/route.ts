import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/auth/session';
import { OfficeService } from '@/lib/offices/office-service';
import { OfficeHolidaySchema } from '@/lib/validators';
import { AuditService } from '@/lib/audit/audit-service';
import { realtimeBus } from '@/lib/realtime/realtime-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const holidays = await OfficeService.getHolidays(session.officeId);
    return NextResponse.json({ success: true, holidays });
  } catch (err: any) {
    console.error('Holidays get error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const parsed = OfficeHolidaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { date, name } = parsed.data;
    const holiday = await OfficeService.addHoliday(session.officeId, date, name);

    await AuditService.log(
      session.officeId,
      'HOLIDAY_ADDED',
      'OFFICE',
      session.userId,
      holiday.id,
      { date, name }
    );

    realtimeBus.broadcast(session.officeId, 'HOLIDAY_UPDATED', {
      action: 'ADD',
      holiday,
    });

    return NextResponse.json({
      success: true,
      holiday,
      message: `✓ Holiday "${name}" added for ${date}`,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Holiday add error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const { holidayId } = await req.json();
    if (!holidayId) {
      return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
    }

    await OfficeService.removeHoliday(holidayId);

    await AuditService.log(
      session.officeId,
      'HOLIDAY_REMOVED',
      'OFFICE',
      session.userId,
      holidayId,
      {}
    );

    realtimeBus.broadcast(session.officeId, 'HOLIDAY_UPDATED', {
      action: 'REMOVE',
      holidayId,
    });

    return NextResponse.json({ success: true, message: 'Holiday removed' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Holiday remove error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
