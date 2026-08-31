import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { ReportService } from '@/lib/reports/report-service';
import { getWeekBoundaries, getOfficeCurrentDate } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const { searchParams } = new URL(req.url);
    const currentDate = getOfficeCurrentDate();
    const { start: defaultStart, end: defaultEnd } = getWeekBoundaries(currentDate);

    const startDate = searchParams.get('startDate') || defaultStart;
    const endDate = searchParams.get('endDate') || defaultEnd;

    const reportData = await ReportService.getWeeklyReportData(
      session.officeId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      report: reportData,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Weekly report error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
