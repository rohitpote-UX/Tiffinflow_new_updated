import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import { MealService } from '@/lib/meals/meal-service';
import { NotificationService } from '@/lib/notifications/notification-service';
import { getOfficeTomorrowDate } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron token' }, { status: 401 });
  }

  let totalDefaulted = 0;

  for (const office of localDb.offices) {
    const targetDate = getOfficeTomorrowDate(office.timezone);
    const { defaultedCount, affectedUsers } = await MealService.autoDefaultMealsForOffice(
      office.id,
      targetDate
    );

    totalDefaulted += defaultedCount;

    // Send notifications to affected users informing them transparently
    for (const userId of affectedUsers) {
      const subs = localDb.push_subscriptions.filter((s) => s.user_id === userId);
      const mem = localDb.memberships.find(
        (m) => m.user_id === userId && m.office_id === office.id
      );
      const prefText = mem?.default_preference === 'always-non-veg' ? '🍗 Non-Veg' : '🥦 Veg';

      for (const sub of subs) {
        await NotificationService.sendPush(sub, {
          title: `${prefText} Automatically Selected`,
          body: `Tomorrow's lunch was auto-selected based on your preference (${mem?.default_preference}).`,
          data: { url: '/app', type: 'auto-default', date: targetDate },
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    totalDefaulted,
    timestamp: new Date().toISOString(),
  });
}
