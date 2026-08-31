import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { AuditService } from '@/lib/audit/audit-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const logs = await AuditService.getOfficeLogs(session.officeId, 50);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error('Audit logs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
