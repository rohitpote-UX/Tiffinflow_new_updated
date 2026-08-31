import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { AuditService } from '@/lib/audit/audit-service';

export async function GET() {
  try {
    const session = await requireAdmin();

    const logs = await AuditService.getOfficeLogs(session.officeId, 50);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Audit logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
