/**
 * MealService — Core business logic for 1-tap confirmations, smart defaults, history
 * Hardened for production with strict server-side validation
 */

import { localDb, Meal, MealSource, Office, Membership } from '../db';
import {
  getOfficeTomorrowDate,
  getOfficeCurrentDate,
  getCutoffCountdown,
  isWorkingDay,
} from '../utils/dates';

export class MealService {
  /**
   * Confirm or update a meal for a user on a given date with strict server validation
   */
  static async confirmMeal(
    userId: string,
    officeId: string,
    date: string,
    mealType: 'veg' | 'non-veg' | 'skip',
    mealSource: MealSource = 'MANUAL'
  ): Promise<Meal> {
    const office = localDb.offices.find((o) => o.id === officeId);
    if (!office) throw new Error('Office not found');

    const membership = localDb.memberships.find(
      (m) => m.user_id === userId && m.office_id === officeId && m.is_active
    );
    if (!membership) throw new Error('User is not an active member of this office');

    // 1. Check if the order for this date has already been finalized
    const isFinalized = localDb.finalized_orders.some(
      (f) => f.office_id === officeId && f.date === date
    );
    if (isFinalized && mealSource !== 'ADMIN') {
      throw new Error('Lunch order for this date has already been finalized by management');
    }

    // 2. Check if date is an active working day
    if (!isWorkingDay(date, office.working_days)) {
      throw new Error('Lunch service is not active on non-working days');
    }

    // 3. Check if date is an office holiday
    const holiday = localDb.office_holidays.find(
      (h) => h.office_id === officeId && h.date === date
    );
    if (holiday) {
      throw new Error(`Office holiday (${holiday.name}) — no lunch scheduled`);
    }

    // 4. Server-side Cutoff Enforcement
    // If confirming for tomorrow and not an admin mutation or automated default:
    const tomorrowDate = getOfficeTomorrowDate(office.timezone);
    const currentDate = getOfficeCurrentDate(office.timezone);

    if (date === tomorrowDate && mealSource === 'MANUAL') {
      const countdown = getCutoffCountdown(office.cutoff_time, office.timezone);
      if (countdown.isPassed) {
        throw new Error(`Meal selection for tomorrow closed at ${office.cutoff_time}`);
      }
    } else if (date < currentDate && mealSource === 'MANUAL') {
      throw new Error('Cannot modify past meal selections');
    }

    // Check pricing
    let price = 0;
    if (mealType === 'veg') price = office.veg_price;
    else if (mealType === 'non-veg') price = office.non_veg_price;

    const status =
      mealType === 'skip'
        ? 'skipped'
        : mealSource === 'AUTO_DEFAULT'
        ? 'auto-defaulted'
        : 'confirmed';

    const mealId = `${userId}_${date}`;
    const now = new Date().toISOString();

    let meal = localDb.meals.find((m) => m.id === mealId);
    if (meal) {
      meal.meal_type = mealType;
      meal.status = status;
      meal.price = price;
      meal.is_auto_defaulted = mealSource === 'AUTO_DEFAULT';
      meal.meal_source = mealSource;
      meal.confirmed_at = now;
      meal.updated_at = now;
    } else {
      meal = {
        id: mealId,
        user_id: userId,
        office_id: officeId,
        date,
        meal_type: mealType,
        status,
        price,
        is_auto_defaulted: mealSource === 'AUTO_DEFAULT',
        meal_source: mealSource,
        confirmed_at: now,
        created_at: now,
        updated_at: now,
      };
      localDb.meals.push(meal);
    }

    localDb.save();
    return meal;
  }

  /**
   * Retrieve a user's meal record for a specific date
   */
  static async getUserMeal(userId: string, date: string): Promise<Meal | null> {
    const meal = localDb.meals.find((m) => m.user_id === userId && m.date === date);
    return meal || null;
  }

  /**
   * Retrieve a user's meal records across a date range
   */
  static async getUserMealsHistory(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Meal[]> {
    return localDb.meals
      .filter((m) => m.user_id === userId && m.date >= startDate && m.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Retrieve all meals for an office on a given date (for Admin Live Orders)
   */
  static async getOfficeMealsByDate(officeId: string, date: string): Promise<Meal[]> {
    return localDb.meals
      .filter((m) => m.office_id === officeId && m.date === date)
      .sort((a, b) => b.confirmed_at.localeCompare(a.confirmed_at));
  }

  /**
   * Auto-default meals for all active office members who haven't responded
   */
  static async autoDefaultMealsForOffice(
    officeId: string,
    date: string
  ): Promise<{ defaultedCount: number; affectedUsers: string[] }> {
    const office = localDb.offices.find((o) => o.id === officeId);
    if (!office || !office.auto_default_enabled) {
      return { defaultedCount: 0, affectedUsers: [] };
    }

    // Check if target date is a working day
    if (!isWorkingDay(date, office.working_days)) {
      return { defaultedCount: 0, affectedUsers: [] };
    }

    // Check if target date is a holiday
    const isHoliday = localDb.office_holidays.some(
      (h) => h.office_id === officeId && h.date === date
    );
    if (isHoliday) {
      return { defaultedCount: 0, affectedUsers: [] };
    }

    // Find all active members
    const members = localDb.memberships.filter(
      (m) => m.office_id === officeId && m.is_active
    );

    let defaultedCount = 0;
    const affectedUsers: string[] = [];

    for (const mem of members) {
      // Check if user already confirmed for this date
      const existing = localDb.meals.find(
        (m) => m.user_id === mem.user_id && m.date === date
      );
      if (!existing) {
        let mealType: 'veg' | 'non-veg' | 'skip' | null = null;
        if (mem.default_preference === 'always-veg') {
          mealType = 'veg';
        } else if (mem.default_preference === 'always-non-veg') {
          mealType = 'non-veg';
        }

        if (mealType) {
          await this.confirmMeal(mem.user_id, officeId, date, mealType, 'AUTO_DEFAULT');
          defaultedCount++;
          affectedUsers.push(mem.user_id);
        }
      }
    }

    return { defaultedCount, affectedUsers };
  }

  /**
   * Emergency cancellation of meals for a target date
   */
  static async cancelOfficeMealsForDate(
    officeId: string,
    date: string,
    reason: string
  ): Promise<{ cancelledCount: number }> {
    const meals = localDb.meals.filter((m) => m.office_id === officeId && m.date === date);
    const now = new Date().toISOString();

    for (const m of meals) {
      m.status = 'cancelled';
      m.price = 0;
      m.updated_at = now;
    }

    localDb.save();
    return { cancelledCount: meals.length };
  }
}
