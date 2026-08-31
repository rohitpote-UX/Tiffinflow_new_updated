import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { OfficeService } from '@/lib/offices/office-service';
import { AuditService } from '@/lib/audit/audit-service';
import { localDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const office = localDb.offices.find((o) => o.id === admin.officeId);
    if (!office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    const oldCode = office.join_code;
    const newCode = OfficeService.generateJoinCode();
    office.join_code = newCode;
    office.updated_at = new Date().toISOString();
    localDb.save();

    await AuditService.log(
      admin.officeId,
      'JOIN_CODE_ROTATED',
      'SETTINGS',
      admin.userId,
      office.id,
      { oldCode, newCode }
    );

    return NextResponse.json({
      success: true,
      message: '✓ Office join code rotated successfully',
      joinCode: newCode,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized: Session expired' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    console.error('Rotate join code error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
