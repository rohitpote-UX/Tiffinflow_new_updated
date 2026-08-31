/**
 * OfficeService — Office configuration, join codes, members, working days, holidays, finalized snapshots
 */

import { localDb, Office, OfficeHoliday, User, Membership, FinalizedOrder } from '../db';
import crypto from 'crypto';

export class OfficeService {
  /**
   * Find office by UUID
   */
  static async getOfficeById(officeId: string): Promise<Office | null> {
    return localDb.offices.find((o) => o.id === officeId) || null;
  }

  /**
   * Find office by invite code (case-insensitive)
   */
  static async getOfficeByJoinCode(code: string): Promise<Office | null> {
    const trimmed = code.trim().toUpperCase();
    return localDb.offices.find((o) => o.join_code.toUpperCase() === trimmed) || null;
  }

  /**
   * Generate clean invite code, e.g. "BITE-7K4P"
   */
  static generateJoinCode(prefix: string = 'BITE'): string {
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${randomHex}`;
  }

  /**
   * Update office settings
   */
  static async updateSettings(
    officeId: string,
    updates: Partial<Omit<Office, 'id' | 'created_at'>>
  ): Promise<Office> {
    const office = localDb.offices.find((o) => o.id === officeId);
    if (!office) throw new Error('Office not found');

    Object.assign(office, updates, { updated_at: new Date().toISOString() });
    localDb.save();
    return office;
  }

  /**
   * Retrieve active team members for an office
   */
  static async getOfficeMembers(officeId: string): Promise<
    Array<{
      user: User;
      membership: Membership;
    }>
  > {
    const memberships = localDb.memberships.filter(
      (m) => m.office_id === officeId && m.is_active
    );

    const result = [];
    for (const mem of memberships) {
      const user = localDb.users.find((u) => u.id === mem.user_id && u.is_active);
      if (user) {
        result.push({ user, membership: mem });
      }
    }

    return result.sort((a, b) => a.user.name.localeCompare(b.user.name));
  }

  /**
   * Add office holiday
   */
  static async addHoliday(
    officeId: string,
    date: string,
    name: string
  ): Promise<OfficeHoliday> {
    const existing = localDb.office_holidays.find(
      (h) => h.office_id === officeId && h.date === date
    );
    if (existing) {
      existing.name = name;
      localDb.save();
      return existing;
    }

    const holiday: OfficeHoliday = {
      id: crypto.randomUUID(),
      office_id: officeId,
      date,
      name,
      created_at: new Date().toISOString(),
    };
    localDb.office_holidays.push(holiday);
    localDb.save();
    return holiday;
  }

  /**
   * Remove office holiday
   */
  static async removeHoliday(holidayId: string): Promise<void> {
    const index = localDb.office_holidays.findIndex((h) => h.id === holidayId);
    if (index !== -1) {
      localDb.office_holidays.splice(index, 1);
      localDb.save();
    }
  }

  /**
   * List office holidays
   */
  static async getHolidays(officeId: string): Promise<OfficeHoliday[]> {
    return localDb.office_holidays
      .filter((h) => h.office_id === officeId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Finalize order operational state and create immutable snapshot for a date
   */
  static async finalizeOrder(
    officeId: string,
    date: string,
    adminId: string = 'admin'
  ): Promise<FinalizedOrder> {
    const office = localDb.offices.find((o) => o.id === officeId);
    if (!office) throw new Error('Office not found');

    const meals = localDb.meals.filter((m) => m.office_id === officeId && m.date === date);

    let vegCount = 0;
    let nonVegCount = 0;
    let skipCount = 0;
    let totalRevenue = 0;

    for (const m of meals) {
      if (m.status === 'cancelled') continue;
      if (m.meal_type === 'veg') {
        vegCount++;
        totalRevenue += m.price;
      } else if (m.meal_type === 'non-veg') {
        nonVegCount++;
        totalRevenue += m.price;
      } else if (m.meal_type === 'skip') {
        skipCount++;
      }
    }

    const totalMeals = vegCount + nonVegCount;
    const now = new Date().toISOString();
    const snapshotId = `${officeId}_${date}`;

    let snapshot = localDb.finalized_orders.find((f) => f.id === snapshotId);
    if (snapshot) {
      snapshot.veg_count = vegCount;
      snapshot.non_veg_count = nonVegCount;
      snapshot.skip_count = skipCount;
      snapshot.total_meals = totalMeals;
      snapshot.total_revenue = totalRevenue;
      snapshot.finalized_by = adminId;
      snapshot.finalized_at = now;
    } else {
      snapshot = {
        id: snapshotId,
        office_id: officeId,
        date,
        veg_count: vegCount,
        non_veg_count: nonVegCount,
        skip_count: skipCount,
        total_meals: totalMeals,
        total_revenue: totalRevenue,
        finalized_by: adminId,
        finalized_at: now,
      };
      localDb.finalized_orders.push(snapshot);
    }

    localDb.save();
    return snapshot;
  }
}
