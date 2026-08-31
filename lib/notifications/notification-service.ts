/**
 * NotificationService — Web Push (VAPID) centralized notification engine
 */

import webpush from 'web-push';
import { localDb, PushSubscriptionRecord, NotificationPreference, NotificationLog } from '../db';
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
   * Save or update Web Push subscription for a user
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
   * Send single Web Push payload to a subscription record
   */
  static async sendPush(
    subscription: PushSubscriptionRecord,
    payload: PushPayload
  ): Promise<boolean> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log('[Dev WebPush Mock] Push notification logged:', payload.title, payload.body);
      return true;
    }

    try {
      const pushSub = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      await webpush.sendNotification(pushSub, JSON.stringify(payload));
      return true;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Subscription has expired or been revoked
        const idx = localDb.push_subscriptions.findIndex((s) => s.id === subscription.id);
        if (idx !== -1) {
          localDb.push_subscriptions.splice(idx, 1);
          localDb.save();
        }
      }
      console.warn('Web push delivery failed:', err.message);
      return false;
    }
  }

  /**
   * Log notification to DB
   */
  static logNotification(
    userId: string | undefined,
    officeId: string | undefined,
    type: string,
    title: string,
    body: string,
    status: string = 'sent'
  ) {
    const log: NotificationLog = {
      id: crypto.randomUUID(),
      user_id: userId,
      office_id: officeId,
      type,
      title,
      body,
      status,
      sent_at: new Date().toISOString(),
    };
    localDb.notification_logs.push(log);
    localDb.save();
  }

  /**
   * Remind pending employees for today's cutoff
   */
  static async remindPendingUsers(
    officeId: string,
    date: string
  ): Promise<{ sentCount: number }> {
    const members = localDb.memberships.filter(
      (m) => m.office_id === officeId && m.is_active
    );

    let sentCount = 0;

    for (const mem of members) {
      const meal = localDb.meals.find(
        (m) => m.user_id === mem.user_id && m.date === date
      );

      if (!meal) {
        // User hasn't responded yet
        const subs = localDb.push_subscriptions.filter(
          (s) => s.user_id === mem.user_id
        );

        const payload: PushPayload = {
          title: '🍱 Lunch Reminder!',
          body: "You haven't selected your meal yet. Tap to confirm Veg, Non-Veg, or Skip.",
          data: { url: '/app', type: 'remind-pending', date },
        };

        for (const sub of subs) {
          await this.sendPush(sub, payload);
        }

        this.logNotification(mem.user_id, officeId, 'remind-pending', payload.title, payload.body);
        sentCount++;
      }
    }

    return { sentCount };
  }

  /**
   * Send Cutoff Extended alert
   */
  static async notifyCutoffExtended(
    officeId: string,
    newCutoffTime: string
  ): Promise<void> {
    const subs = localDb.push_subscriptions.filter((s) => s.office_id === officeId);
    const payload: PushPayload = {
      title: '⏰ Cutoff Time Extended!',
      body: `Lunch cutoff has been extended to ${newCutoffTime}. Select your meal now!`,
      data: { url: '/app', type: 'cutoff-extended' },
    };

    for (const sub of subs) {
      await this.sendPush(sub, payload);
    }
    this.logNotification(undefined, officeId, 'cutoff-extended', payload.title, payload.body);
  }

  /**
   * Send Emergency Meal Cancelled alert
   */
  static async notifyEmergencyCancellation(
    officeId: string,
    date: string,
    reason: string
  ): Promise<void> {
    const subs = localDb.push_subscriptions.filter((s) => s.office_id === officeId);
    const payload: PushPayload = {
      title: '⚠️ Lunch Cancelled',
      body: `Lunch for ${date} has been cancelled by office. Reason: ${reason}`,
      data: { url: '/app', type: 'meal-cancelled' },
    };

    for (const sub of subs) {
      await this.sendPush(sub, payload);
    }
    this.logNotification(undefined, officeId, 'meal-cancelled', payload.title, payload.body);
  }
}
