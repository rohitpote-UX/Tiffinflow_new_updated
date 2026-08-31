import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { MealService } from '@/lib/meals/meal-service';
import { getMonthBoundaries } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    const { start, end } = getMonthBoundaries(year, month);
    const meals = await MealService.getUserMealsHistory(session.userId, start, end);

    const vegCount = meals.filter((m) => m.meal_type === 'veg').length;
    const nonVegCount = meals.filter((m) => m.meal_type === 'non-veg').length;
    const skippedCount = meals.filter((m) => m.meal_type === 'skip').length;
    const totalAmount = meals.reduce((sum, m) => sum + m.price, 0);

    return NextResponse.json({
      success: true,
      year,
      month,
      start,
      end,
      meals,
      stats: {
        totalDays: meals.length,
        vegCount,
        nonVegCount,
        skippedCount,
        totalAmount,
      },
    });
  } catch (err: any) {
    console.error('History error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
