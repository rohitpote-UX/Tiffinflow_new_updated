import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import { NotificationService, SmartCutoffStage } from '@/lib/notifications/notification-service';
import { getOfficeTomorrowDate, isWorkingDay, getCutoffCountdown } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron token' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stageParam = searchParams.get('stage')?.toUpperCase();
  const isUrgentParam = searchParams.get('urgent');

  // Determine requested stage
  let requestedStage: SmartCutoffStage | 'AUTO' = 'AUTO';
  if (stageParam === 'ONE_HOUR' || stageParam === 'THIRTY_MINUTES' || stageParam === 'FIVE_MINUTES') {
    requestedStage = stageParam as SmartCutoffStage;
  } else if (isUrgentParam === 'true') {
    requestedStage = 'FIVE_MINUTES';
  } else if (isUrgentParam === 'false') {
    requestedStage = 'THIRTY_MINUTES';
  }

  let totalSent = 0;
  let totalSkipped = 0;
  const stageBreakdown: Record<string, number> = {
    ONE_HOUR: 0,
    THIRTY_MINUTES: 0,
    FIVE_MINUTES: 0,
  };

  for (const office of localDb.offices) {
    const targetDate = getOfficeTomorrowDate(office.timezone);

    // Skip non-working days
    if (!isWorkingDay(targetDate, office.working_days)) continue;

    // Skip holidays
    const isHoliday = localDb.office_holidays.some(
      (h) => h.office_id === office.id && h.date === targetDate
    );
    if (isHoliday) continue;

    let effectiveStage: SmartCutoffStage | null = null;

    if (requestedStage === 'AUTO') {
      const countdown = getCutoffCountdown(office.cutoff_time, office.timezone);

      if (countdown.isPassed) {
        continue; // Cutoff already passed, do not send any reminders
      }

      // Safe evaluation windows:
      // 1. ONE_HOUR: 50 to 70 minutes left
      // 2. THIRTY_MINUTES: 20 to 40 minutes left
      // 3. FIVE_MINUTES: 1 to 10 minutes left
      if (countdown.minutesLeft >= 50 && countdown.minutesLeft <= 70) {
        effectiveStage = 'ONE_HOUR';
      } else if (countdown.minutesLeft >= 20 && countdown.minutesLeft <= 40) {
        effectiveStage = 'THIRTY_MINUTES';
      } else if (countdown.minutesLeft >= 1 && countdown.minutesLeft <= 10) {
        effectiveStage = 'FIVE_MINUTES';
      } else {
        // Outside safe reminder window -> skip to avoid stale/out-of-order notification spam
        continue;
      }
    } else {
      effectiveStage = requestedStage;
    }

    if (effectiveStage) {
      const { sentCount, skippedCount } = await NotificationService.notifySmartCutoffStage(
        office.id,
        targetDate,
        office.cutoff_time,
        effectiveStage
      );

      totalSent += sentCount;
      totalSkipped += skippedCount;
      stageBreakdown[effectiveStage] = (stageBreakdown[effectiveStage] || 0) + sentCount;
    }
  }

  return NextResponse.json({
    success: true,
    mode: requestedStage,
    totalNotificationsSent: totalSent,
    totalNotificationsSkipped: totalSkipped,
    stageBreakdown,
    timestamp: new Date().toISOString(),
  });
}
