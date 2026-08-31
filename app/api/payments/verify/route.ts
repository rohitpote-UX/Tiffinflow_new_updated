import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { PaymentService } from '@/lib/payments/payment-service';
import { PaymentMarkPaidSchema } from '@/lib/validators';
import { AuditService } from '@/lib/audit/audit-service';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await req.json();
    const parsed = PaymentMarkPaidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { paymentId, notes } = parsed.data;
    const payment = await PaymentService.markPaymentPaid(paymentId, session.id, notes);

    await AuditService.log(
      session.officeId,
      'PAYMENT_MARKED_PAID',
      'PAYMENT',
      session.id,
      paymentId,
      { amount: payment.amount, notes }
    );

    return NextResponse.json({
      success: true,
      payment,
      message: '✓ Payment marked as paid. Receipt generated.',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Payment verify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
