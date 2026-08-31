import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { localDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const logs = localDb.notification_logs
      .filter((l) => l.office_id === session.officeId || !l.office_id)
      .sort((a, b) => b.sent_at.localeCompare(a.sent_at))
      .slice(0, 100);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Notification logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
