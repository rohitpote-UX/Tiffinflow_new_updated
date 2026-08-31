/**
 * NotificationService — Production-grade Web Push (VAPID) centralized notification engine
 * 
 * Features:
 * 1. Professional, concise notification copy (Max 1 emoji, clean and actionable)
 * 2. Idempotency protection to prevent duplicate sends
 * 3. Exponential backoff retry for transient network/gateway failures
 * 4. Automatic cleanup of expired/revoked subscriptions (HTTP 404/410)
 * 5. Multi-device support per employee
 * 6. Subscription deduplication
 * 7. Comprehensive notification logging & delivery observability
 */

import webpush from 'web-push';
import { localDb, PushSubscriptionRecord, NotificationLog } from '../db';
import { formatTime12h, formatCutoffDisplay } from '../utils/dates';
import crypto from 'crypto';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@bitebuddy.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn('Failed to configure VAPID details:', e);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export class NotificationService {
  /**
   * Save or update Web Push subscription for a user (deduplicating by endpoint)
   */
  static async subscribe(
    userId: string,
    officeId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    }
  ): Promise<PushSubscriptionRecord> {
    const existing = localDb.push_subscriptions.find((s) => s.endpoint === subscription.endpoint);
    const now = new Date().toISOString();

    if (existing) {
      existing.user_id = userId;
      existing.office_id = officeId;
      existing.p256dh = subscription.keys.p256dh;
      existing.auth = subscription.keys.auth;
      existing.user_agent = subscription.userAgent;
      existing.updated_at = now;
      localDb.save();
      return existing;
    }

    const newSub: PushSubscriptionRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      office_id: officeId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: subscription.userAgent,
      created_at: now,
      updated_at: now,
    };

    localDb.push_subscriptions.push(newSub);
    localDb.save();
    return newSub;
  }

  /**
   * Send single Web Push payload with exponential backoff retry and expired subscription cleanup
   */
  static async sendPushWithRetry(
    subscription: PushSubscriptionRecord,
    payload: PushPayload,
    maxRetries: number = 3
  ): Promise<{ success: boolean; status: 'SENT' | 'FAILED' | 'EXPIRED'; error?: string }> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log(`[Dev WebPush Mock] [${subscription.user_id}] -> ${payload.title}: ${payload.body}`);
      return { success: true, status: 'SENT' };
    }

    const pushSub = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        await webpush.sendNotification(pushSub, JSON.stringify(payload));
        return { success: true, status: 'SENT' };
      } catch (err: any) {
        const statusCode = err.statusCode;

        // Permanent failure: subscription expired or revoked
        if (statusCode === 404 || statusCode === 410) {
          const idx = localDb.push_subscriptions.findIndex((s) => s.id === subscription.id);
          if (idx !== -1) {
            localDb.push_subscriptions.splice(idx, 1);
            localDb.save();
          }
          console.warn(`Cleaned up expired push subscription for user ${subscription.user_id} (${statusCode})`);
          return { success: false, status: 'EXPIRED', error: `Subscription expired (${statusCode})` };
        }

        // Transient failure: retry with controlled backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms...
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.warn(`Web push delivery failed after ${maxRetries} attempts:`, err.message);
          return { success: false, status: 'FAILED', error: err.message };
        }
      }
    }

    return { success: false, status: 'FAILED', error: 'Max retries exceeded' };
  }

  /**
   * Dispatch push notification to all active devices registered by a user
   */
  static async sendPushToUser(
    userId: string,
    payload: PushPayload
  ): Promise<{ success: boolean; devicesCount: number }> {
    const subs = localDb.push_subscriptions.filter((s) => s.user_id === userId);
    if (subs.length === 0) {
      return { success: false, devicesCount: 0 };
    }

    let anySuccess = false;
    for (const sub of subs) {
      const res = await this.sendPushWithRetry(sub, payload);
      if (res.success) anySuccess = true;
    }

    return { success: anySuccess, devicesCount: subs.length };
  }

  /**
   * Check idempotency to prevent duplicate notification sends
   * Key format: `${officeId}_${userId}_${date}_${type}`
   */
  static checkIdempotency(key: string): boolean {
    const existing = localDb.notification_logs.find(
      (l) => (l as any).idempotency_key === key && l.status === 'sent'
    );
    return Boolean(existing);
  }

  /**
   * Log notification delivery record to DB
   */
  static logNotification(
    userId: string | undefined,
    officeId: string | undefined,
    type: string,
    title: string,
    body: string,
    status: string = 'sent',
    idempotencyKey?: string,
    failureReason?: string
  ): NotificationLog {
    const log: NotificationLog & { idempotency_key?: string; failure_reason?: string } = {
      id: crypto.randomUUID(),
      user_id: userId,
      office_id: officeId,
      type,
      title,
      body,
      status,
      sent_at: new Date().toISOString(),
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      ...(failureReason ? { failure_reason: failureReason } : {}),
    };
    localDb.notification_logs.push(log as NotificationLog);
    localDb.save();
    return log;
  }

  // ── Standardized Notification Dispatches ──────────────────────────────

  /**
   * Meal Selection Opened:
   * Title: 🍱 Tomorrow's lunch is ready
   * Body: Choose Veg, Non-Veg or Skip before 7:00 PM.
   */
  static async notifyMealSelectionOpened(
    officeId: string,
    targetDate: string,
    cutoffTime24h: string = '19:00'
  ): Promise<{ sentCount: number }> {
    const formattedCutoff = formatCutoffDisplay(cutoffTime24h);
    const members = localDb.memberships.filter((m) => m.office_id === officeId && m.is_active);
    let sentCount = 0;

    const title = "🍱 Tomorrow's lunch is ready";
    const body = `Choose Veg, Non-Veg or Skip before ${formattedCutoff}.`;

    for (const mem of members) {
      const idempotencyKey = `${officeId}_${mem.user_id}_${targetDate}_meal-opened`;
      if (this.checkIdempotency(idempotencyKey)) continue;

      const payload: PushPayload = {
        title,
        body,
        data: { url: '/app', type: 'meal-opened', date: targetDate },
      };

      const result = await this.sendPushToUser(mem.user_id, payload);
      this.logNotification(mem.user_id, officeId, 'meal-opened', title, body, result.success ? 'sent' : 'failed', idempotencyKey);
      if (result.success) sentCount++;
    }

    return { sentCount };
  }

  /**
   * Remind Pending Employees:
   * Title: 🥗 Lunch decision pending
   * Body: You haven't chosen tomorrow's meal yet.
   */
  static async remindPendingUsers(
    officeId: string,
    date: string
  ): Promise<{ sentCount: number }> {
    const members = localDb.memberships.filter((m) => m.office_id === officeId && m.is_active);
    let sentCount = 0;

    const title = '🥗 Lunch decision pending';
    const body = "You haven't chosen tomorrow's meal yet.";

    for (const mem of members) {
      const meal = localDb.meals.find((m) => m.user_id === mem.user_id && m.date === date);
      if (!meal) {
        const idempotencyKey = `${officeId}_${mem.user_id}_${date}_daily-reminder`;
        if (this.checkIdempotency(idempotencyKey)) continue;

        const payload: PushPayload = {
          title,
          body,
          data: { url: '/app', type: 'daily-reminder', date },
        };

        const result = await this.sendPushToUser(mem.user_id, payload);
        this.logNotification(mem.user_id, officeId, 'daily-reminder', title, body, result.success ? 'sent' : 'failed', idempotencyKey);
        if (result.success) sentCount++;
      }
    }

    return { sentCount };
  }

  /**
   * Cutoff Warning (30m / 5m):
   * 30m -> Title: ⏰ 30 minutes left | Body: Lunch selection closes at 7:00 PM.
   * 5m  -> Title: 🚨 5 minutes left  | Body: Choose your meal before the cutoff.
   */
  static async notifyCutoffWarning(
    officeId: string,
    targetDate: string,
    cutoffTime24h: string = '19:00',
    isUrgent: boolean = false
  ): Promise<{ sentCount: number }> {
    const formattedCutoff = formatCutoffDisplay(cutoffTime24h);
    const members = localDb.memberships.filter((m) => m.office_id === officeId && m.is_active);
    let sentCount = 0;

    const title = isUrgent ? '🚨 5 minutes left' : '⏰ 30 minutes left';
    const body = isUrgent
      ? 'Choose your meal before the cutoff.'
      : `Lunch selection closes at ${formattedCutoff}.`;
    const type = isUrgent ? 'urgent-cutoff-warning' : 'cutoff-warning';

    for (const mem of members) {
      const meal = localDb.meals.find((m) => m.user_id === mem.user_id && m.date === targetDate);
      if (!meal) {
        const idempotencyKey = `${officeId}_${mem.user_id}_${targetDate}_${type}`;
        if (this.checkIdempotency(idempotencyKey)) continue;

        const payload: PushPayload = {
          title,
          body,
          data: { url: '/app', type, date: targetDate },
        };

        const result = await this.sendPushToUser(mem.user_id, payload);
        this.logNotification(mem.user_id, officeId, type, title, body, result.success ? 'sent' : 'failed', idempotencyKey);
        if (result.success) sentCount++;
      }
    }

    return { sentCount };
  }

  /**
   * Auto Default Alert:
   * Title: 🍱 Lunch sorted
   * Body: We've selected Veg for tomorrow based on your preference.
   */
  static async notifyAutoDefault(
    userId: string,
    officeId: string,
    targetDate: string,
    preference: string
  ): Promise<void> {
    const mealTypeText = preference === 'always-non-veg' ? 'Non-Veg' : 'Veg';
    const title = '🍱 Lunch sorted';
    const body = `We've selected ${mealTypeText} for tomorrow based on your preference.`;

    const idempotencyKey = `${officeId}_${userId}_${targetDate}_auto-default`;
    if (this.checkIdempotency(idempotencyKey)) return;

    const payload: PushPayload = {
      title,
      body,
      data: { url: '/app', type: 'auto-default', date: targetDate },
    };

    const result = await this.sendPushToUser(userId, payload);
    this.logNotification(userId, officeId, 'auto-default', title, body, result.success ? 'sent' : 'failed', idempotencyKey);
  }

  /**
   * Meal Price Change Alert:
   * Title: 💰 Meal price updated
   * Body: Tomorrow's Veg meal is now ₹85 per plate.
   */
  static async notifyPriceChange(
    officeId: string,
    vegPrice: number,
    nonVegPrice: number
  ): Promise<void> {
    const members = localDb.memberships.filter((m) => m.office_id === officeId && m.is_active);
    const title = '💰 Meal price updated';
    const body = `Tomorrow's Veg meal is now ₹${vegPrice} per plate.`;

    for (const mem of members) {
      const payload: PushPayload = {
        title,
        body,
        data: { url: '/app', type: 'price-update' },
      };
      const result = await this.sendPushToUser(mem.user_id, payload);
      this.logNotification(mem.user_id, officeId, 'price-update', title, body, result.success ? 'sent' : 'failed');
    }
  }

  /**
   * Cutoff Extended Alert:
   * Title: ⏰ Cutoff extended
   * Body: You now have until 7:30 PM to choose tomorrow's lunch.
   */
  static async notifyCutoffExtended(
    officeId: string,
    newCutoffTime: string
  ): Promise<void> {
    const formattedCutoff = formatTime12h(newCutoffTime);
    const members = localDb.memberships.filter((m) => m.office_id === officeId && m.is_active);
    const title = '⏰ Cutoff extended';
    const body = `You now have until ${formattedCutoff} to choose tomorrow's lunch.`;

    for (const mem of members) {
      const payload: PushPayload = {
        title,
        body,
        data: { url: '/app', type: 'cutoff-extended' },
      };
      const result = await this.sendPushToUser(mem.user_id, payload);
      this.logNotification(mem.user_id, officeId, 'cutoff-extended', title, body, result.success ? 'sent' : 'failed');
    }
  }

  /**
   * Emergency Meal Cancellation Alert:
   * Title: ⚠️ Lunch cancelled
   * Body: Lunch for tomorrow has been cancelled. Reason: ...
   */
  static async notifyEmergencyCancellation(
    officeId: string,
    date: string,
    reason: string
  ): Promise<void> {
    const members = localDb.memberships.filter((m) => m.office_id === officeId && m.is_active);
    const title = '⚠️ Lunch cancelled';
    const body = `Lunch for tomorrow has been cancelled. Reason: ${reason}`;

    for (const mem of members) {
      const payload: PushPayload = {
        title,
        body,
        data: { url: '/app', type: 'meal-cancelled' },
      };
      const result = await this.sendPushToUser(mem.user_id, payload);
      this.logNotification(mem.user_id, officeId, 'meal-cancelled', title, body, result.success ? 'sent' : 'failed');
    }
  }

  /**
   * Weekly Billing Summary Notification:
   * Title: 💳 Weekly lunch bill ready
   * Body: Your bill for this week is ₹400 (5 Veg). Tap to review.
   */
  static async notifyWeeklyBill(
    userId: string,
    officeId: string,
    formattedAmount: string,
    vegDays: number,
    nonVegDays: number
  ): Promise<void> {
    const title = '💳 Weekly lunch bill ready';
    const body = `Your bill for this week is ${formattedAmount} (${vegDays} Veg, ${nonVegDays} Non-Veg).`;

    const payload: PushPayload = {
      title,
      body,
      data: { url: '/app/payments', type: 'weekly-bill' },
    };

    const result = await this.sendPushToUser(userId, payload);
    this.logNotification(userId, officeId, 'weekly-bill', title, body, result.success ? 'sent' : 'failed');
  }
}
