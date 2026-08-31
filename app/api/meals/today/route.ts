import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { localDb } from '@/lib/db';
import { MealService } from '@/lib/meals/meal-service';
import { OfficeService } from '@/lib/offices/office-service';
import {
  getOfficeCurrentDate,
  getOfficeTomorrowDate,
  getCutoffCountdown,
  isWorkingDay,
  getWeekBoundaries,
} from '@/lib/utils/dates';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const office = await OfficeService.getOfficeById(session.officeId);
    if (!office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    const membership = localDb.memberships.find(
      (m) => m.user_id === session.userId && m.office_id === session.officeId
    );

    const targetDate = getOfficeTomorrowDate(office.timezone);
    const currentDate = getOfficeCurrentDate(office.timezone);

    const tomorrowMeal = await MealService.getUserMeal(session.userId, targetDate);
    const todayMeal = await MealService.getUserMeal(session.userId, currentDate);

    // Get last choice
    const historyMeals = await MealService.getUserMealsHistory(session.userId, '2020-01-01', currentDate);
    const lastConfirmedMeal = historyMeals.find((m) => m.meal_type !== 'skip');

    // Check working days & holidays
    const isTargetWorkingDay = isWorkingDay(targetDate, office.working_days);
    const holidays = await OfficeService.getHolidays(session.officeId);
    const targetHoliday = holidays.find((h) => h.date === targetDate);

    // Cutoff status
    const countdown = getCutoffCountdown(office.cutoff_time, office.timezone);

    // Week stats
    const { start: weekStart, end: weekEnd } = getWeekBoundaries(currentDate, office.week_start_day);
    const weekMeals = await MealService.getUserMealsHistory(session.userId, weekStart, weekEnd);
    const weekVeg = weekMeals.filter((m) => m.meal_type === 'veg').length;
    const weekNonVeg = weekMeals.filter((m) => m.meal_type === 'non-veg').length;
    const weekSkip = weekMeals.filter((m) => m.meal_type === 'skip').length;
    const weekTotal = weekMeals.reduce((sum, m) => sum + m.price, 0);

    return NextResponse.json({
      success: true,
      targetDate,
      currentDate,
      tomorrowMeal,
      todayMeal,
      lastChoice: lastConfirmedMeal ? lastConfirmedMeal.meal_type : null,
      office: {
        id: office.id,
        name: office.name,
        vegPrice: office.veg_price,
        nonVegPrice: office.non_veg_price,
        cutoffTime: office.cutoff_time,
        timezone: office.timezone,
        joinCode: office.join_code,
      },
      membership: {
        role: membership?.role || 'USER',
        defaultPreference: membership?.default_preference || 'flexible',
      },
      schedule: {
        isWorkingDay: isTargetWorkingDay,
        holiday: targetHoliday ? targetHoliday.name : null,
      },
      countdown,
      weeklySummary: {
        weekStart,
        weekEnd,
        vegDays: weekVeg,
        nonVegDays: weekNonVeg,
        skippedDays: weekSkip,
        totalAmount: weekTotal,
      },
    });
  } catch (err: any) {
    console.error('Today meal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
