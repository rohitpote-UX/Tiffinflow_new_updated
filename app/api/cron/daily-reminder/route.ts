import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notification-service';
import { getOfficeTomorrowDate, isWorkingDay } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron token' }, { status: 401 });
  }

  let totalSent = 0;

  for (const office of localDb.offices) {
    const targetDate = getOfficeTomorrowDate(office.timezone);

    // Skip non-working days
    if (!isWorkingDay(targetDate, office.working_days)) continue;

    // Skip holidays
    const isHoliday = localDb.office_holidays.some(
      (h) => h.office_id === office.id && h.date === targetDate
    );
    if (isHoliday) continue;

    const { sentCount } = await NotificationService.notifyMealSelectionOpened(
      office.id,
      targetDate,
      office.cutoff_time
    );
    totalSent += sentCount;
  }

  return NextResponse.json({
    success: true,
    totalNotificationsSent: totalSent,
    timestamp: new Date().toISOString(),
  });
}
