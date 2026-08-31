import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { MealConfirmSchema } from '@/lib/validators';
import { MealService } from '@/lib/meals/meal-service';
import { OfficeService } from '@/lib/offices/office-service';
import { getCutoffCountdown, isWorkingDay } from '@/lib/utils/dates';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = MealConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { date, mealType } = parsed.data;
    const officeId = session.officeId;

    const office = await OfficeService.getOfficeById(officeId);
    if (!office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    // Check if target date is a working day
    if (!isWorkingDay(date, office.working_days)) {
      return NextResponse.json({ error: 'No meals are scheduled for non-working days.' }, { status: 400 });
    }

    // Check if target date is an office holiday
    const holidays = await OfficeService.getHolidays(officeId);
    const holiday = holidays.find((h) => h.date === date);
    if (holiday) {
      return NextResponse.json({ error: `Office holiday (${holiday.name}). No meal service available.` }, { status: 400 });
    }

    // Check cutoff time if confirming for tomorrow or today
    const countdown = getCutoffCountdown(office.cutoff_time, office.timezone);
    // If the cutoff is passed and user is trying to modify today's/tomorrow's meal
    if (countdown.isPassed && session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: `Meal confirmation closed at ${office.cutoff_time}. Please contact your office admin for late changes.` },
        { status: 403 }
      );
    }

    const meal = await MealService.confirmMeal(session.userId, officeId, date, mealType, 'MANUAL');

    return NextResponse.json({
      success: true,
      meal,
      message: `✓ ${mealType === 'veg' ? 'Veg' : mealType === 'non-veg' ? 'Non-Veg' : 'Skip'} confirmed for ${date}!`,
    });
  } catch (err: any) {
    console.error('Meal confirm error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
