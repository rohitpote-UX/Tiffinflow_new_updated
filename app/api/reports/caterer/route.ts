import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { ReportService } from '@/lib/reports/report-service';
import { OfficeService } from '@/lib/offices/office-service';
import { getOfficeTomorrowDate } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const office = await OfficeService.getOfficeById(session.officeId);
    if (!office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    const date = searchParams.get('date') || getOfficeTomorrowDate(office.timezone);
    const whatsAppText = await ReportService.generateCatererWhatsAppText(session.officeId, date);

    return NextResponse.json({
      success: true,
      date,
      whatsAppText,
    });
  } catch (err: any) {
    console.error('Caterer report error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
