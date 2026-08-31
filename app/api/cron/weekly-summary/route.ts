import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notification-service';
import { PaymentService } from '@/lib/payments/payment-service';
import { getOfficeCurrentDate, formatCurrency } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron token' }, { status: 401 });
  }

  const currentDate = getOfficeCurrentDate();
  let totalBillsGenerated = 0;

  for (const office of localDb.offices) {
    const { generatedCount } = await PaymentService.generateWeeklyBillsForOffice(
      office.id,
      currentDate
    );
    totalBillsGenerated += generatedCount;

    // Send push notification to office members with pending balance
    const members = localDb.memberships.filter(
      (m) => m.office_id === office.id && m.is_active
    );

    for (const mem of members) {
      const bill = await PaymentService.calculateWeeklyBill(mem.user_id, office.id, currentDate);
      if (bill.totalAmount > 0) {
        const subs = localDb.push_subscriptions.filter((s) => s.user_id === mem.user_id);
        const formattedAmount = formatCurrency(bill.totalAmount);
        for (const sub of subs) {
          await NotificationService.sendPush(sub, {
            title: '💳 Weekly Lunch Bill Ready',
            body: `Your bill for this week is ${formattedAmount} (${bill.vegDays} Veg, ${bill.nonVegDays} Non-Veg). Tap to review.`,
            data: { url: '/app/payments', type: 'weekly-bill' },
          });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    totalBillsGenerated,
    timestamp: new Date().toISOString(),
  });
}
