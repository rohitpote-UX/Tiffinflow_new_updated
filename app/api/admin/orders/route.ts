import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { localDb } from '@/lib/db';
import { MealService } from '@/lib/meals/meal-service';
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

    const targetDate = searchParams.get('date') || getOfficeTomorrowDate(office.timezone);
    const meals = await MealService.getOfficeMealsByDate(session.officeId, targetDate);
    const members = await OfficeService.getOfficeMembers(session.officeId);

    const memberMap = new Map(members.map((m) => [m.user.id, m.user]));

    const orders = meals.map((m) => {
      const user = memberMap.get(m.user_id);
      return {
        id: m.id,
        userId: m.user_id,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || '',
        userPhone: user?.phone || '',
        date: m.date,
        mealType: m.meal_type,
        status: m.status,
        price: m.price,
        isAutoDefaulted: m.is_auto_defaulted,
        confirmedAt: m.confirmed_at,
      };
    });

    return NextResponse.json({
      success: true,
      targetDate,
      orders,
    });
  } catch (err: any) {
    console.error('Admin orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
