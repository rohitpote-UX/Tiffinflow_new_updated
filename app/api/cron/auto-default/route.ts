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

    // Send clean auto-default notifications to affected users
    for (const userId of affectedUsers) {
      const mem = localDb.memberships.find(
        (m) => m.user_id === userId && m.office_id === office.id
      );
      if (mem) {
        await NotificationService.notifyAutoDefault(
          userId,
          office.id,
          targetDate,
          mem.default_preference
        );
      }
    }
  }

  return NextResponse.json({
    success: true,
    totalDefaulted,
    timestamp: new Date().toISOString(),
  });
}
