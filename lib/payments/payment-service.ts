/**
 * PaymentService — Weekly/Monthly billing, payment settlements, and digital receipts
 * Hardened with duplicate prevention and idempotent weekly billing generation
 */

import { localDb, Payment, Meal, Office, User } from '../db';
import { getWeekBoundaries } from '../utils/dates';
import crypto from 'crypto';

export class PaymentService {
  /**
   * Calculate pending & paid totals for a user across a week
   */
  static async calculateWeeklyBill(
    userId: string,
    officeId: string,
    dateStr: string
  ): Promise<{
    periodStart: string;
    periodEnd: string;
    vegDays: number;
    nonVegDays: number;
    skippedDays: number;
    totalAmount: number;
    meals: Meal[];
  }> {
    const office = localDb.offices.find((o) => o.id === officeId);
    if (!office) throw new Error('Office not found');

    const { start, end } = getWeekBoundaries(dateStr, office.week_start_day);
    const meals = localDb.meals.filter(
      (m) => m.user_id === userId && m.date >= start && m.date <= end && m.status !== 'cancelled'
    );

    const vegDays = meals.filter((m) => m.meal_type === 'veg').length;
    const nonVegDays = meals.filter((m) => m.meal_type === 'non-veg').length;
    const skippedDays = meals.filter((m) => m.meal_type === 'skip').length;
    const totalAmount = meals.reduce((sum, m) => sum + m.price, 0);

    return {
      periodStart: start,
      periodEnd: end,
      vegDays,
      nonVegDays,
      skippedDays,
      totalAmount,
      meals,
    };
  }

  /**
   * Generate/update weekly payment records for all active members of an office (Idempotent)
   */
  static async generateWeeklyBillsForOffice(
    officeId: string,
    dateStr: string
  ): Promise<{ generatedCount: number; totalBilled: number }> {
    const office = localDb.offices.find((o) => o.id === officeId);
    if (!office) throw new Error('Office not found');

    const { start, end } = getWeekBoundaries(dateStr, office.week_start_day);
    const members = localDb.memberships.filter(
      (m) => m.office_id === officeId && m.is_active
    );

    let generatedCount = 0;
    let totalBilled = 0;
    const now = new Date().toISOString();

    for (const mem of members) {
      const bill = await this.calculateWeeklyBill(mem.user_id, officeId, dateStr);
      if (bill.totalAmount > 0) {
        // Find existing payment for this period
        let payment = localDb.payments.find(
          (p) => p.user_id === mem.user_id && p.period_start === start && p.period_end === end
        );

        if (payment) {
          if (payment.status !== 'paid') {
            payment.amount = bill.totalAmount;
            payment.updated_at = now;
          }
        } else {
          payment = {
            id: crypto.randomUUID(),
            user_id: mem.user_id,
            office_id: officeId,
            amount: bill.totalAmount,
            period_start: start,
            period_end: end,
            status: 'pending',
            created_at: now,
            updated_at: now,
          };
          localDb.payments.push(payment);
          generatedCount++;
        }
        totalBilled += bill.totalAmount;
      }
    }

    localDb.save();
    return { generatedCount, totalBilled };
  }

  /**
   * Retrieve all payments for an office
   */
  static async getOfficePayments(officeId: string): Promise<
    Array<{
      payment: Payment;
      user: User | null;
    }>
  > {
    const payments = localDb.payments.filter((p) => p.office_id === officeId);
    return payments
      .map((p) => ({
        payment: p,
        user: localDb.users.find((u) => u.id === p.user_id) || null,
      }))
      .sort((a, b) => b.payment.created_at.localeCompare(a.payment.created_at));
  }

  /**
   * Retrieve payments for a specific user
   */
  static async getUserPayments(userId: string): Promise<Payment[]> {
    return localDb.payments
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.period_start.localeCompare(a.period_start));
  }

  /**
   * Mark payment as paid with receipt generation
   */
  static async markPaymentPaid(
    paymentId: string,
    adminUserId: string,
    notes?: string
  ): Promise<Payment> {
    const payment = localDb.payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment record not found');

    const now = new Date().toISOString();
    payment.status = 'paid';
    payment.marked_paid_by = adminUserId;
    payment.paid_at = now;
    if (notes) payment.receipt_notes = notes;
    payment.updated_at = now;

    localDb.save();
    return payment;
  }
}
