# 🍱 BiteBuddy 2.0 — Production Next.js PWA & Office Meal Platform

BiteBuddy is a modern, mobile-first office meal management platform built with **Next.js 15+ (App Router)**, **PWA support**, **Web Push Notifications (VAPID)**, and multi-tenant **PostgreSQL**.

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` or `.env.local` (VAPID keys are already pre-generated):
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Features

### Employee Experience (`/app`)
- **1-Tap Meal Confirmation**: 🥦 Veg (₹80), 🍗 Non-Veg (₹100), ⏭ Skip (₹0)
- **Live Countdown Timer**: Dynamic urgency states (Normal, 30m Warning, 5m Urgent Pulse, Selection Closed)
- **Smart Dietary Defaults**: Auto-selects Veg/Non-Veg when busy, with full transparency and change options
- **Undo Action Bar**: 5-second undo toast after meal selection
- **Meal History Calendar (`/app/history`)**: Color-coded monthly view with detailed day modals
- **Payments Ledger (`/app/payments`)**: Running weekly bill calculation and verified receipts
- **Dietary Profile (`/app/profile`)**: Switch preferences, toggle Web Push alerts, copy team join code

### Admin Operations Center (`/admin`)
- **Decision-Driven Dashboard**: Real-time response rate, headcounts, revenue gauge
- **Action Required: Remind Pending**: 1-click targeted Web Push notifications to pending employees
- **Operational Controls**: Finalize Order, Extend Cutoff boundary, Emergency Meal Cancellation
- **Send to Caterer**: 1-click formatted WhatsApp text copy (`/api/reports/caterer`)
- **Live Orders Queue (`/admin/orders`)**: Real-time search by employee and filter tabs
- **Team Roster & QR Onboarding (`/admin/members`)**: Printable QR code modal generator
- **Reports & Excel Export (`/admin/reports`)**: `.xlsx` export via `xlsx` library and printable PDF layout
- **Office Settings (`/admin/settings`)**: Meal prices, cutoff times, working days, holiday manager
- **Security Audit Trail (`/admin/audit`)**: Immutable log of administrative actions

---

## 🔔 Web Push Notifications

Automated cron endpoints:
- `GET /api/cron/daily-reminder` (10:00 AM meal opening)
- `GET /api/cron/cutoff-warning` (6:30 PM & 6:55 PM pending reminders)
- `GET /api/cron/auto-default` (7:01 PM dietary default processor)
- `GET /api/cron/weekly-summary` (Friday weekly bill generation)

Generate new VAPID keys anytime:
```bash
npm run generate:vapid
```

---

## 🗄️ Database & Migration

- **PostgreSQL Schema**: Defined in `schema.sql` (compatible with Supabase & standard PostgreSQL).
- **SQLite Data Migration**:
```bash
npm run migrate:sqlite
```
Extracts existing SQLite data from `backend/tiffinflow.db` and generates `migration.sql`.
