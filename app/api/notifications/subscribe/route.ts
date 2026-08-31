import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { NotificationService } from '@/lib/notifications/notification-service';
import { PushSubscriptionSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = PushSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const sub = await NotificationService.subscribe(session.userId, session.officeId, {
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      userAgent: parsed.data.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: '✓ Web Push Notifications enabled successfully!',
      subscriptionId: sub.id,
    });
  } catch (err: any) {
    console.error('Push subscribe error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
