# BiteBuddy 2.0 — Production Database Architecture & Operations Guide

## 1. Executive Summary

BiteBuddy employs a strongly typed, relational database architecture powered by **PostgreSQL** and **Prisma ORM**. It is architected for high reliability, multi-tenant isolation, ACID transaction consistency, and seamless serverless deployment across Vercel and containerized environments.

```
                    BiteBuddy PWA (Mobile & Web)
                                │
                                ▼
                       Next.js App Router
                     (Edge Auth / Middleware)
                                │
                   ┌────────────┴────────────┐
                   │                         │
                   ▼                         ▼
             Server APIs              Server Actions
                   │                         │
                   └────────────┬────────────┘
                                │
                                ▼
                       Prisma ORM Client
                    (lib/db/prisma.ts Singleton)
                                │
                                ▼
               Managed PostgreSQL (Neon / Supabase / AWS RDS)
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
    Workspaces/Offices        Users                Meals & Orders
         │                      │                      │
         ▼                      ▼                      ▼
    Memberships            Push Devices           Notifications
```

---

## 2. Entity Relational Architecture & Core Models

### A. Core Tables & Responsibilities

| Table Name | Model Identifier | Primary Responsibility | Critical Constraints & Invariants |
|---|---|---|---|
| **`Office`** | `Office` | Company workplace tenant boundary | `@unique(join_code)`, default pricing, cutoff time (`19:00`), timezone |
| **`User`** | `User` | User identity & credentials | `@unique(email)`, bcrypt password hash, active status |
| **`Membership`** | `Membership` | Connects user to office with role | `@@unique([user_id, office_id])`, role (`ADMIN` \| `USER`), **Max 2 Admins** |
| **`Meal`** | `Meal` | Individual employee meal selection | `@@unique([user_id, date])`, choice (`veg` \| `non_veg` \| `skip`), status |
| **`FinalizedOrder`**| `FinalizedOrder` | Daily immutable caterer order snapshot | `@@unique([office_id, date])`, aggregated counts and revenue |
| **`Payment`** | `Payment` | Monthly billing ledger record | Tracking period, amount, status (`pending` \| `paid`), admin verification |
| **`PushSubscription`**| `PushSubscription`| Web Push endpoint registration | `@unique(endpoint)`, multi-device support per employee |
| **`NotificationLog`** | `NotificationLog` | Reminder delivery log & audit | `@unique(idempotency_key)` to prevent duplicate pushes |
| **`NotificationPreference`**| `NotificationPreference`| User granular notification toggles | `@unique(user_id)` |
| **`OfficeHoliday`** | `OfficeHoliday` | Company non-working days | `@@unique([office_id, date])` |
| **`AuditLog`** | `AuditLog` | Immutable admin action audit trail | Indexed by `[office_id, created_at]`, JSON metadata |
| **`PasswordResetToken`**| `PasswordResetToken`| 6-digit OTP tokens | Expiring OTP tokens linked to `User` |

---

## 3. Multi-Tenant Security & Isolation Rules

1. **Server-Side Scoping Only**:
   - The client browser **never** sends SQL or determines tenant access.
   - Every API handler extracts `officeId` directly from the verified cryptographic JWT session cookie (`getCurrentUser()` / `requireAuth()`).
2. **2-Admin Hard Limit**:
   - The database prevents exceeding 2 administrators per workplace via server-side atomic counting (`DbRepository.countOfficeAdmins` and `MembershipService`).
3. **Role Elevation Protection**:
   - Registration endpoints (`/api/offices/join`) strictly assign `role: 'USER'` on the server regardless of client request payloads.
4. **Idempotency Guarantees**:
   - Reminders and auto-default routines use deterministic compound keys to prevent double-billing or spamming employees.

---

## 4. Environment Variables

Configure the following variables in your `.env` (local) and Vercel Project Settings (Production):

```bash
# PostgreSQL Connection String with Connection Pooling (PgBouncer)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct PostgreSQL Connection for Prisma Migrations
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# JWT Authentication Secret (32+ random characters)
JWT_SECRET="your-32-character-production-jwt-secret-key"

# VAPID Web Push Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-vapid-key"
VAPID_PRIVATE_KEY="your-private-vapid-key"
VAPID_SUBJECT="mailto:support@bitebuddy.app"

# Cron Webhook Security Token
CRON_SECRET="your-cron-secret-token"
```

---

## 5. Developer Workflows & CLI Commands

### Generate Prisma Client
```bash
npx prisma generate
```

### Apply Schema Changes Locally (Development Migration)
```bash
npx prisma migrate dev --name <migration_name>
```

### Apply Pending Migrations in Production (CI/CD / Vercel Build)
```bash
npx prisma migrate deploy
```

### Open Prisma Studio (Database GUI Inspector)
```bash
npx prisma studio
```

### Format Prisma Schema
```bash
npx prisma format
```

---

## 6. Connection Pooling & Serverless Strategy

In Next.js on Vercel, serverless function lambdas are spun up and torn down dynamically. To prevent connection exhaustion:
1. **Global Singleton**: `lib/db/prisma.ts` preserves a single instance across hot-reloads and container executions.
2. **Transaction Mode Connection String**: `DATABASE_URL` connects through port `6543` with `?pgbouncer=true&connection_limit=1`.
3. **Direct URL for Migrations**: `DIRECT_URL` connects through port `5432` for DDL migration commands.

---

## 7. Automated Backups & Disaster Recovery

- **Daily Automated Backups**: Managed provider (Supabase / Neon / AWS RDS) performs automated daily point-in-time recovery (PITR) with a 7–30 day retention window.
- **Data Export**: Admins can export order history, meal summaries, and payment ledgers in `.xlsx` and `.pdf` formats at any time from `/admin/reports`.
