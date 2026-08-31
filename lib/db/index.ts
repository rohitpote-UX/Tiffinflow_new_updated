/**
 * Database client and repository layer for BiteBuddy 2.0
 * Supports:
 * 1. Supabase PostgreSQL (@supabase/supabase-js)
 * 2. Standalone resilient persistence fallback for local development
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ── Types ─────────────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Office {
  id: string;
  organization_id?: string;
  name: string;
  admin_id: string;
  veg_price: number;
  non_veg_price: number;
  cutoff_time: string; // "19:00"
  timezone: string; // "Asia/Kolkata"
  week_start_day: number; // 1 = Monday
  auto_default_enabled: boolean;
  join_code: string;
  working_days: number[]; // [1, 2, 3, 4, 5]
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash?: string;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  office_id: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'FINANCE' | 'CATERER' | 'USER';
  default_preference: 'flexible' | 'always-veg' | 'always-non-veg';
  is_active: boolean;
  joined_at: string;
  updated_at: string;
}

export type MealSource = 'MANUAL' | 'AUTO_DEFAULT' | 'ADMIN';

export interface Meal {
  id: string; // user_id + '_' + date
  user_id: string;
  office_id: string;
  date: string; // YYYY-MM-DD
  meal_type: 'veg' | 'non-veg' | 'skip';
  status: 'confirmed' | 'auto-defaulted' | 'skipped' | 'cancelled';
  price: number;
  is_auto_defaulted: boolean;
  meal_source: MealSource;
  confirmed_at: string;
  created_at: string;
  updated_at: string;
}

export interface FinalizedOrder {
  id: string; // office_id + '_' + date
  office_id: string;
  date: string; // YYYY-MM-DD
  veg_count: number;
  non_veg_count: number;
  skip_count: number;
  total_meals: number;
  total_revenue: number;
  finalized_by: string; // user_id
  finalized_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  office_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: 'pending' | 'paid' | 'overdue';
  marked_paid_by?: string;
  paid_at?: string;
  receipt_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  office_id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  lunch_reminder: boolean;
  cutoff_warning: boolean;
  auto_default_alert: boolean;
  payment_reminders: boolean;
  weekly_summary: boolean;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id?: string;
  office_id?: string;
  type: string;
  title: string;
  body: string;
  status: string;
  sent_at: string;
  read_at?: string;
}

export interface OfficeHoliday {
  id: string;
  office_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  office_id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface PasswordResetToken {
  token: string;
  user_id: string;
  expires_at: string;
}

// ── Supabase Client Initialization ────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ── In-Memory & Local Development Store with JSON Persistence ─────────
export interface LocalStoreData {
  organizations: Organization[];
  offices: Office[];
  users: User[];
  memberships: Membership[];
  meals: Meal[];
  finalized_orders: FinalizedOrder[];
  payments: Payment[];
  push_subscriptions: PushSubscriptionRecord[];
  notification_preferences: NotificationPreference[];
  notification_logs: NotificationLog[];
  office_holidays: OfficeHoliday[];
  audit_logs: AuditLog[];
  password_reset_tokens: PasswordResetToken[];
}

const LOCAL_STORE_FILE = path.join(process.cwd(), '.bitebuddy_store.json');

export class LocalDatabaseStore {
  public data: LocalStoreData;

  constructor() {
    this.data = this.loadFromFile();
    if (this.data.offices.length === 0) {
      this.seedDefaultData();
    }
  }

  private loadFromFile(): LocalStoreData {
    try {
      if (fs.existsSync(LOCAL_STORE_FILE)) {
        const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          organizations: parsed.organizations || [],
          offices: parsed.offices || [],
          users: parsed.users || [],
          memberships: parsed.memberships || [],
          meals: parsed.meals || [],
          finalized_orders: parsed.finalized_orders || [],
          payments: parsed.payments || [],
          push_subscriptions: parsed.push_subscriptions || [],
          notification_preferences: parsed.notification_preferences || [],
          notification_logs: parsed.notification_logs || [],
          office_holidays: parsed.office_holidays || [],
          audit_logs: parsed.audit_logs || [],
          password_reset_tokens: parsed.password_reset_tokens || [],
        };
      }
    } catch (e) {
      console.warn('Failed to load local store file:', e);
    }
    return {
      organizations: [],
      offices: [],
      users: [],
      memberships: [],
      meals: [],
      finalized_orders: [],
      payments: [],
      push_subscriptions: [],
      notification_preferences: [],
      notification_logs: [],
      office_holidays: [],
      audit_logs: [],
      password_reset_tokens: [],
    };
  }

  public save(): void {
    try {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write local store:', e);
    }
  }

  private seedDefaultData() {
    const defaultOfficeId = '00000000-0000-0000-0000-000000000001';
    const defaultAdminId = 'admin-user-001';
    const now = new Date().toISOString();

    const office: Office = {
      id: defaultOfficeId,
      name: 'Acme Corp HQ',
      admin_id: defaultAdminId,
      veg_price: 80,
      non_veg_price: 100,
      cutoff_time: '19:00',
      timezone: 'Asia/Kolkata',
      week_start_day: 1,
      auto_default_enabled: true,
      join_code: 'BITE-HQ',
      working_days: [1, 2, 3, 4, 5],
      created_at: now,
      updated_at: now,
    };

    const adminUser: User = {
      id: defaultAdminId,
      name: 'Rohit Pote (Admin)',
      email: 'admin@bitebuddy.app',
      phone: '+91 9876543210',
      password_hash: '$2b$10$wE96c21eXJzE9sA65fU.r.248y8aP6e3lE9bA5pT9V2yZ6mO8K', // password
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const adminMembership: Membership = {
      id: 'mem-admin-001',
      user_id: defaultAdminId,
      office_id: defaultOfficeId,
      role: 'ADMIN',
      default_preference: 'flexible',
      is_active: true,
      joined_at: now,
      updated_at: now,
    };

    const defaultEmployeeId = 'emp-user-001';
    const employeeUser: User = {
      id: defaultEmployeeId,
      name: 'Priya Sharma',
      email: 'employee@bitebuddy.app',
      phone: '+91 9811223344',
      password_hash: '$2b$10$wE96c21eXJzE9sA65fU.r.248y8aP6e3lE9bA5pT9V2yZ6mO8K', // password
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const employeeMembership: Membership = {
      id: 'mem-emp-001',
      user_id: defaultEmployeeId,
      office_id: defaultOfficeId,
      role: 'USER',
      default_preference: 'always-veg',
      is_active: true,
      joined_at: now,
      updated_at: now,
    };

    this.data.offices.push(office);
    this.data.users.push(adminUser, employeeUser);
    this.data.memberships.push(adminMembership, employeeMembership);
    this.save();
  }

  // Repository Getters
  get organizations() { return this.data.organizations; }
  get offices() { return this.data.offices; }
  get users() { return this.data.users; }
  get memberships() { return this.data.memberships; }
  get meals() { return this.data.meals; }
  get finalized_orders() { return this.data.finalized_orders; }
  get payments() { return this.data.payments; }
  get push_subscriptions() { return this.data.push_subscriptions; }
  get notification_preferences() { return this.data.notification_preferences; }
  get notification_logs() { return this.data.notification_logs; }
  get office_holidays() { return this.data.office_holidays; }
  get audit_logs() { return this.data.audit_logs; }
  get password_reset_tokens() { return this.data.password_reset_tokens; }
}

export const localDb = new LocalDatabaseStore();
