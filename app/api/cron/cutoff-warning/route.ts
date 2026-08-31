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

  const { searchParams } = new URL(req.url);
  const isUrgent = searchParams.get('urgent') === 'true'; // e.g. 5 minutes vs 30 minutes

  let totalSent = 0;

  for (const office of localDb.offices) {
    const targetDate = getOfficeTomorrowDate(office.timezone);

    if (!isWorkingDay(targetDate, office.working_days)) continue;
    const isHoliday = localDb.office_holidays.some(
      (h) => h.office_id === office.id && h.date === targetDate
    );
    if (isHoliday) continue;

    // Send only to pending responders
    const members = localDb.memberships.filter(
      (m) => m.office_id === office.id && m.is_active
    );

    for (const mem of members) {
      const meal = localDb.meals.find(
        (m) => m.user_id === mem.user_id && m.date === targetDate
      );
      if (!meal) {
        const subs = localDb.push_subscriptions.filter((s) => s.user_id === mem.user_id);
        const title = isUrgent ? '🚨 5 Minutes Left to Confirm!' : '⏳ 30 Minutes Left!';
        const body = isUrgent
          ? `Cutoff is in 5 minutes! Confirm your meal now before selection closes at ${office.cutoff_time}.`
          : `Cutoff is approaching at ${office.cutoff_time}. Confirm your meal now!`;

        for (const sub of subs) {
          await NotificationService.sendPush(sub, {
            title,
            body,
            data: { url: '/app', type: isUrgent ? 'urgent-cutoff' : 'cutoff-warning', date: targetDate },
          });
          totalSent++;
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    isUrgent,
    totalNotificationsSent: totalSent,
    timestamp: new Date().toISOString(),
  });
}
