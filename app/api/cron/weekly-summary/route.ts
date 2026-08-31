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
        const formattedAmount = formatCurrency(bill.totalAmount);
        await NotificationService.notifyWeeklyBill(
          mem.user_id,
          office.id,
          formattedAmount,
          bill.vegDays,
          bill.nonVegDays
        );
      }
    }
  }

  return NextResponse.json({
    success: true,
    totalBillsGenerated,
    timestamp: new Date().toISOString(),
  });
}
