/**
 * ReportService — Caterer WhatsApp summary, Excel report builder, Weekly/Monthly data
 */

import { localDb, Office, Meal, User } from '../db';
import { formatDisplayDate, formatFullDate, formatCurrency } from '../utils/dates';

export class ReportService {
  /**
   * Generates formatted WhatsApp text summary for Caterers
   */
  static async generateCatererWhatsAppText(
    officeId: string,
    date: string
  ): Promise<string> {
    const office = localDb.offices.find((o) => o.id === officeId);
    const officeName = office?.name || 'Office';

    const meals = localDb.meals.filter(
      (m) => m.office_id === officeId && m.date === date && m.status !== 'cancelled'
    );

    const vegCount = meals.filter((m) => m.meal_type === 'veg').length;
    const nonVegCount = meals.filter((m) => m.meal_type === 'non-veg').length;
    const totalCount = vegCount + nonVegCount;

    const formattedDate = formatFullDate(date);

    return `🍱 *BITEBUDDY LUNCH ORDER*
📅 *Date:* ${formattedDate}

🥦 *Veg Meals:* ${vegCount}
🍗 *Non-Veg Meals:* ${nonVegCount}
📦 *Total Quantity:* ${totalCount} meals

🏢 *Office:* ${officeName}
⏰ *Preferred Delivery:* 12:30 PM

_Generated via BiteBuddy 2.0_`;
  }

  /**
   * Generate weekly report data for an office
   */
  static async getWeeklyReportData(
    officeId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    officeName: string;
    startDate: string;
    endDate: string;
    totalVeg: number;
    totalNonVeg: number;
    totalSkipped: number;
    totalRevenue: number;
    userBreakdown: Array<{
      userName: string;
      email: string;
      vegDays: number;
      nonVegDays: number;
      skippedDays: number;
      totalAmount: number;
    }>;
  }> {
    const office = localDb.offices.find((o) => o.id === officeId);
    const members = localDb.memberships.filter(
      (m) => m.office_id === officeId && m.is_active
    );

    const userBreakdown = [];
    let grandVeg = 0;
    let grandNonVeg = 0;
    let grandSkipped = 0;
    let grandRevenue = 0;

    for (const mem of members) {
      const user = localDb.users.find((u) => u.id === mem.user_id);
      if (!user) continue;

      const meals = localDb.meals.filter(
        (m) =>
          m.user_id === user.id &&
          m.date >= startDate &&
          m.date <= endDate &&
          m.status !== 'cancelled'
      );

      const veg = meals.filter((m) => m.meal_type === 'veg').length;
      const nonVeg = meals.filter((m) => m.meal_type === 'non-veg').length;
      const skip = meals.filter((m) => m.meal_type === 'skip').length;
      const total = meals.reduce((sum, m) => sum + m.price, 0);

      grandVeg += veg;
      grandNonVeg += nonVeg;
      grandSkipped += skip;
      grandRevenue += total;

      userBreakdown.push({
        userName: user.name,
        email: user.email,
        vegDays: veg,
        nonVegDays: nonVeg,
        skippedDays: skip,
        totalAmount: total,
      });
    }

    return {
      officeName: office?.name || 'Office',
      startDate,
      endDate,
      totalVeg: grandVeg,
      totalNonVeg: grandNonVeg,
      totalSkipped: grandSkipped,
      totalRevenue: grandRevenue,
      userBreakdown: userBreakdown.sort((a, b) => a.userName.localeCompare(b.userName)),
    };
  }
}
