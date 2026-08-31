import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { PaymentService } from '@/lib/payments/payment-service';
import { getOfficeCurrentDate } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'ADMIN') {
      const officePayments = await PaymentService.getOfficePayments(session.officeId);
      return NextResponse.json({
        success: true,
        payments: officePayments.map((p) => ({
          ...p.payment,
          userName: p.user?.name || 'Unknown User',
          userEmail: p.user?.email || '',
          userPhone: p.user?.phone || '',
        })),
      });
    }

    // Employee personal payments & weekly bill
    const userPayments = await PaymentService.getUserPayments(session.userId);
    const currentDate = getOfficeCurrentDate();
    const currentWeekBill = await PaymentService.calculateWeeklyBill(
      session.userId,
      session.officeId,
      currentDate
    );

    return NextResponse.json({
      success: true,
      payments: userPayments,
      currentWeekBill,
    });
  } catch (err: any) {
    console.error('Payments get error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
