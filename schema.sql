-- ============================================================================
-- BITEBUDDY 2.0 — COMPREHENSIVE MULTI-TENANT POSTGRESQL SCHEMA
-- Compatible with Supabase & standard PostgreSQL
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations Table (Top-level multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Offices Table (Individual office locations / branches)
CREATE TABLE IF NOT EXISTS offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    admin_id VARCHAR(255), -- User ID of primary office administrator
    veg_price INTEGER NOT NULL DEFAULT 80, -- Price in ₹
    non_veg_price INTEGER NOT NULL DEFAULT 100, -- Price in ₹
    cutoff_time VARCHAR(10) NOT NULL DEFAULT '19:00', -- 24h format HH:MM
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    week_start_day INTEGER NOT NULL DEFAULT 1, -- 0=Sunday, 1=Monday
    auto_default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    join_code VARCHAR(32) NOT NULL UNIQUE, -- E.g. BITE-7K4P
    working_days JSONB NOT NULL DEFAULT '[1, 2, 3, 4, 5]'::jsonb, -- 1=Mon, 5=Fri
    finalized_orders JSONB DEFAULT '{}'::jsonb, -- Map of date -> timestamp finalized
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users Table (Global user accounts)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY, -- Can be Supabase auth.users UUID or custom UUID
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    password_hash TEXT, -- Stored securely with bcrypt for custom auth sessions
    photo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Memberships Table (Links users to offices with specific roles & preferences)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'USER', -- 'OWNER' | 'ADMIN' | 'MANAGER' | 'FINANCE' | 'CATERER' | 'USER'
    default_preference VARCHAR(50) NOT NULL DEFAULT 'flexible', -- 'flexible' | 'always-veg' | 'always-non-veg'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_office UNIQUE (user_id, office_id)
);

-- 5. Meals Table (Daily meal records)
CREATE TABLE IF NOT EXISTS meals (
    id VARCHAR(255) PRIMARY KEY, -- Composite key: user_id + '_' + date
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    date DATE NOT NULL, -- 'YYYY-MM-DD'
    meal_type VARCHAR(20) NOT NULL, -- 'veg' | 'non-veg' | 'skip'
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'auto-defaulted' | 'skipped' | 'cancelled'
    price INTEGER NOT NULL DEFAULT 0,
    is_auto_defaulted BOOLEAN NOT NULL DEFAULT FALSE,
    meal_source VARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- 'MANUAL' | 'AUTO_DEFAULT' | 'ADMIN'
    confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_meal_date UNIQUE (user_id, date)
);

-- 5.1 Finalized Orders Table (Immutable historical snapshots of daily counts)
CREATE TABLE IF NOT EXISTS finalized_orders (
    id VARCHAR(255) PRIMARY KEY, -- office_id + '_' + date
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    veg_count INTEGER NOT NULL DEFAULT 0,
    non_veg_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    total_meals INTEGER NOT NULL DEFAULT 0,
    total_revenue INTEGER NOT NULL DEFAULT 0,
    finalized_by VARCHAR(255) REFERENCES users(id),
    finalized_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_office_finalized_date UNIQUE (office_id, date)
);

-- 6. Payments Table (Weekly & monthly bill settlements)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'overdue'
    marked_paid_by VARCHAR(255) REFERENCES users(id),
    paid_at TIMESTAMPTZ,
    receipt_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Push Subscriptions Table (Web Push VAPID endpoints)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    lunch_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    cutoff_warning BOOLEAN NOT NULL DEFAULT TRUE,
    auto_default_alert BOOLEAN NOT NULL DEFAULT TRUE,
    payment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_summary BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'meal-reminder' | 'cutoff-warning' | 'auto-default' | 'payment-reminder' | 'announcement'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'sent', -- 'sent' | 'delivered' | 'failed'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 10. Office Holidays Table
CREATE TABLE IF NOT EXISTS office_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_office_holiday_date UNIQUE (office_id, date)
);

-- 11. Audit Logs Table (Administrative audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'PRICE_CHANGE' | 'CUTOFF_EXTENDED' | 'MEAL_CANCELLED' | 'PAYMENT_MARKED_PAID'
    entity_type VARCHAR(50) NOT NULL, -- 'OFFICE' | 'MEAL' | 'PAYMENT' | 'USER'
    entity_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERY EXECUTION
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_offices_join_code ON offices(join_code);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_office_id ON memberships(office_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(role);

CREATE INDEX IF NOT EXISTS idx_meals_office_date ON meals(office_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);

CREATE INDEX IF NOT EXISTS idx_payments_office ON payments(office_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_office ON push_subscriptions(office_id);

CREATE INDEX IF NOT EXISTS idx_audit_office ON audit_logs(office_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: In Next.js server-side queries using SUPABASE_SERVICE_ROLE_KEY or direct pooled connections,
-- tenant isolation is rigorously enforced through office_id filters in the query layer.
