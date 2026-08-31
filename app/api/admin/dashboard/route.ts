import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { localDb } from '@/lib/db';
import { OfficeService } from '@/lib/offices/office-service';
import { MealService } from '@/lib/meals/meal-service';
import { getOfficeTomorrowDate, getCutoffCountdown } from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();

    const { searchParams } = new URL(req.url);
    const office = await OfficeService.getOfficeById(session.officeId);
    if (!office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    const targetDate = searchParams.get('date') || getOfficeTomorrowDate(office.timezone);

    // Get all active members
    const members = await OfficeService.getOfficeMembers(session.officeId);
    const totalMembers = members.length;

    // Get all meals for this date
    const meals = await MealService.getOfficeMealsByDate(session.officeId, targetDate);

    const vegMeals = meals.filter((m) => m.meal_type === 'veg' && m.status !== 'cancelled');
    const nonVegMeals = meals.filter((m) => m.meal_type === 'non-veg' && m.status !== 'cancelled');
    const skipMeals = meals.filter((m) => m.meal_type === 'skip');
    const cancelledMeals = meals.filter((m) => m.status === 'cancelled');

    const vegCount = vegMeals.length;
    const nonVegCount = nonVegMeals.length;
    const skipCount = skipMeals.length;
    const totalOrdered = vegCount + nonVegCount;
    const respondedCount = meals.length;
    const pendingCount = Math.max(0, totalMembers - respondedCount);
    const responseRate = totalMembers > 0 ? Math.round((respondedCount / totalMembers) * 100) : 0;

    const totalRevenue = meals.reduce((sum, m) => sum + m.price, 0);

    // List of pending users who haven't selected
    const respondedUserIds = new Set(meals.map((m) => m.user_id));
    const pendingUsers = members
      .filter((m) => !respondedUserIds.has(m.user.id))
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        defaultPreference: m.membership.default_preference,
      }));

    const countdown = getCutoffCountdown(office.cutoff_time, office.timezone);
    const finalizedRecord = localDb.finalized_orders.find(
      (f) => f.office_id === session.officeId && f.date === targetDate
    );
    const isFinalized = Boolean(finalizedRecord);

    return NextResponse.json({
      success: true,
      targetDate,
      office: {
        id: office.id,
        name: office.name,
        joinCode: office.join_code,
        cutoffTime: office.cutoff_time,
        vegPrice: office.veg_price,
        nonVegPrice: office.non_veg_price,
      },
      stats: {
        totalMembers,
        vegCount,
        nonVegCount,
        skipCount,
        cancelledCount: cancelledMeals.length,
        totalOrdered,
        respondedCount,
        pendingCount,
        responseRate,
        totalRevenue,
      },
      countdown,
      isFinalized,
      finalizedAt: finalizedRecord?.finalized_at || null,
      pendingUsers,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }
    console.error('Admin dashboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
