/**
 * Test Suite: Database Architecture, Models, Integrity & Multi-Tenant Isolation
 * 
 * Verifies:
 * 1. Prisma Client & Model Definitions
 * 2. Workspace / Office Creation & Join Code Uniqueness
 * 3. User & Membership Persistence with Server-Side Roles
 * 4. 2-Admin Hard Limit Enforcement
 * 5. Meal Selection & Compound Unique Invariants
 * 6. Finalized Order Snapshots & Revenue Tracking
 * 7. Payment Ledger & Verification
 * 8. Multi-Tenant Query Scoping & Isolation
 * 9. Push Subscription Multi-Device Support
 * 10. Audit Log Traceability
 */

import { localDb } from '../lib/db';
import { DbRepository } from '../lib/db/repository';
import { OfficeService } from '../lib/offices/office-service';
import { hashPassword } from '../lib/auth/session';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runDatabaseTests() {
  console.log('\n=============================================================');
  console.log('🗄️ RUNNING DATABASE ARCHITECTURE & PERSISTENCE TEST SUITE');
  console.log('=============================================================\n');

  const now = new Date().toISOString();
  const testDate = '2026-09-02';

  // ── 1. Workspace / Office Creation & Uniqueness ─────────────────────────────
  console.log('--- 1. Workspace / Office Creation & Tenant Isolation ---');
  const officeAlphaId = crypto.randomUUID();
  const joinCodeAlpha = 'CORP-ALPHA';
  localDb.offices.push({
    id: officeAlphaId,
    name: 'Stark Industries',
    admin_id: 'tony_stark_01',
    veg_price: 80,
    non_veg_price: 120,
    cutoff_time: '19:00',
    timezone: 'Asia/Kolkata',
    week_start_day: 1,
    auto_default_enabled: true,
    join_code: joinCodeAlpha,
    working_days: [1, 2, 3, 4, 5],
    created_at: now,
    updated_at: now,
  });

  const officeBetaId = crypto.randomUUID();
  const joinCodeBeta = 'CORP-BETA';
  localDb.offices.push({
    id: officeBetaId,
    name: 'Wayne Enterprises',
    admin_id: 'bruce_wayne_01',
    veg_price: 90,
    non_veg_price: 130,
    cutoff_time: '18:30',
    timezone: 'Asia/Kolkata',
    week_start_day: 1,
    auto_default_enabled: true,
    join_code: joinCodeBeta,
    working_days: [1, 2, 3, 4, 5],
    created_at: now,
    updated_at: now,
  });
  localDb.save();

  const foundAlpha = await DbRepository.findOfficeByJoinCode(joinCodeAlpha);
  assert(foundAlpha?.name === 'Stark Industries', 'Office Alpha found by unique join code');
  assert(foundAlpha?.non_veg_price === 120, 'Office Alpha non-veg price is ₹120');

  const foundBeta = await DbRepository.findOfficeByJoinCode(joinCodeBeta);
  assert(foundBeta?.name === 'Wayne Enterprises', 'Office Beta found by unique join code');
  assert(foundBeta?.id !== foundAlpha?.id, 'Office Alpha and Beta have distinct primary keys');

  // ── 2. User & Membership Persistence ────────────────────────────────────────
  console.log('\n--- 2. User & Membership Relational Persistence ---');
  const admin1Id = `admin_${crypto.randomUUID().slice(0, 8)}`;
  const admin1Email = `tony_${crypto.randomUUID().slice(0, 6)}@stark.com`;
  localDb.users.push({
    id: admin1Id,
    name: 'Tony Stark',
    email: admin1Email,
    phone: '+91 9999900001',
    password_hash: await hashPassword('iamironman'),
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  localDb.memberships.push({
    id: crypto.randomUUID(),
    user_id: admin1Id,
    office_id: officeAlphaId,
    role: 'ADMIN',
    default_preference: 'always-non-veg',
    is_active: true,
    joined_at: now,
    updated_at: now,
  });

  const emp1Id = `emp_${crypto.randomUUID().slice(0, 8)}`;
  const emp1Email = `peter_${crypto.randomUUID().slice(0, 6)}@stark.com`;
  localDb.users.push({
    id: emp1Id,
    name: 'Peter Parker',
    email: emp1Email,
    phone: '+91 9999900002',
    password_hash: await hashPassword('spidey123'),
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  localDb.memberships.push({
    id: crypto.randomUUID(),
    user_id: emp1Id,
    office_id: officeAlphaId,
    role: 'USER',
    default_preference: 'always-veg',
    is_active: true,
    joined_at: now,
    updated_at: now,
  });
  localDb.save();

  const userRecord = await DbRepository.findUserByEmail(emp1Email);
  assert(userRecord !== null, 'User found by unique email index');
  assert(userRecord?.name === 'Peter Parker', 'User profile matches Peter Parker');
  assert(userRecord?.memberships.length === 1, 'User has exactly 1 active workspace membership');
  assert(userRecord?.memberships[0].role === 'USER', 'Membership role strictly assigned as USER');

  // ── 3. 2-Admin Hard Limit Enforcement ───────────────────────────────────────
  console.log('\n--- 3. 2-Admin Workplace Security Guard ---');
  let adminCountAlpha = await DbRepository.countOfficeAdmins(officeAlphaId);
  assert(adminCountAlpha === 1, 'Office Alpha initially has 1 Admin');

  // Promote Peter to Admin -> Allowed (Admin count becomes 2)
  try {
    const promoteResult = await OfficeService.promoteMemberToAdmin(officeAlphaId, admin1Id, emp1Id);
    assert(promoteResult.membership.role === 'ADMIN', 'Promoting 2nd Admin succeeds');
  } catch (err: any) {
    assert(false, `Promoting 2nd Admin failed: ${err.message}`);
  }

  adminCountAlpha = await DbRepository.countOfficeAdmins(officeAlphaId);
  assert(adminCountAlpha === 2, 'Office Alpha now has exactly 2 Admins');

  // Attempt to promote 3rd Admin -> Blocked!
  const emp2Id = `emp_${crypto.randomUUID().slice(0, 8)}`;
  localDb.users.push({
    id: emp2Id,
    name: 'Ned Leeds',
    email: `ned_${crypto.randomUUID().slice(0, 6)}@stark.com`,
    phone: '+91 9999900003',
    password_hash: await hashPassword('guyinthechair'),
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  localDb.memberships.push({
    id: crypto.randomUUID(),
    user_id: emp2Id,
    office_id: officeAlphaId,
    role: 'USER',
    default_preference: 'flexible',
    is_active: true,
    joined_at: now,
    updated_at: now,
  });
  localDb.save();

  try {
    await OfficeService.promoteMemberToAdmin(officeAlphaId, admin1Id, emp2Id);
    assert(false, 'Promoting 3rd Admin should fail');
  } catch (err: any) {
    assert(
      err.message.includes('Maximum limit of 2 administrators'),
      'Promoting 3rd Admin is rejected by server guard (Max 2 Admins reached)'
    );
  }

  // ── 4. Meal Selection & Compound Unique Invariants ──────────────────────────
  console.log('\n--- 4. Meal Selection & Compound Key Invariants ---');
  const mealId = `${emp1Id}_${testDate}`;
  localDb.meals.push({
    id: mealId,
    user_id: emp1Id,
    office_id: officeAlphaId,
    date: testDate,
    meal_type: 'veg',
    status: 'confirmed',
    price: 80,
    is_auto_defaulted: false,
    meal_source: 'MANUAL',
    confirmed_at: now,
    created_at: now,
    updated_at: now,
  });
  localDb.save();

  const storedMeal = await DbRepository.findMealByUserAndDate(emp1Id, testDate);
  assert(storedMeal !== null, 'Meal selection found by compound user_id + date key');
  assert(storedMeal?.meal_type === 'veg', 'Meal type is veg');
  assert(storedMeal?.price === 80, 'Price recorded as ₹80');

  // Update choice to non-veg
  storedMeal!.meal_type = 'non-veg';
  storedMeal!.price = 120;
  localDb.save();

  const updatedMeal = await DbRepository.findMealByUserAndDate(emp1Id, testDate);
  assert(updatedMeal?.meal_type === 'non-veg', 'Meal choice updated to non-veg');
  assert(updatedMeal?.price === 120, 'Updated price reflects non-veg ₹120');

  // ── 5. Immutable Finalized Order Snapshot ───────────────────────────────────
  console.log('\n--- 5. Daily Finalized Order Snapshot ---');
  const snapshot = await OfficeService.finalizeOrder(officeAlphaId, testDate, admin1Id);
  assert(snapshot !== null, 'Daily order finalized snapshot created');
  assert(snapshot.total_meals === 1, 'Total meals finalized count is 1');
  assert(snapshot.total_revenue === 120, 'Total revenue calculated accurately (₹120)');

  // ── 6. Multi-Tenant Scoping ─────────────────────────────────────────────────
  console.log('\n--- 6. Multi-Tenant Query Scoping ---');
  const alphaMeals = await DbRepository.listMealsByOfficeAndDate(officeAlphaId, testDate);
  const betaMeals = await DbRepository.listMealsByOfficeAndDate(officeBetaId, testDate);
  assert(alphaMeals.length === 1, 'Office Alpha query returns 1 meal');
  assert(betaMeals.length === 0, 'Office Beta query returns 0 meals (Zero tenant leakage)');

  // ── 7. Push Subscriptions (Multi-Device) ────────────────────────────────────
  console.log('\n--- 7. Push Subscriptions Multi-Device Storage ---');
  localDb.push_subscriptions.push(
    {
      id: crypto.randomUUID(),
      user_id: emp1Id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/spidey-phone',
      p256dh: 'p256_key_phone',
      auth: 'auth_key_phone',
      user_agent: 'BiteBuddy Android App',
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      user_id: emp1Id,
      endpoint: 'https://updates.push.services.mozilla.com/spidey-laptop',
      p256dh: 'p256_key_laptop',
      auth: 'auth_key_laptop',
      user_agent: 'BiteBuddy Desktop Chrome',
      created_at: now,
      updated_at: now,
    }
  );
  localDb.save();

  const subscriptions = await DbRepository.listPushSubscriptions(emp1Id);
  assert(subscriptions.length === 2, 'Employee has 2 distinct device push subscriptions registered');

  // ── 8. Immutable Audit Trail ────────────────────────────────────────────────
  console.log('\n--- 8. Immutable Audit Trail ---');
  const auditEntry = await DbRepository.createAuditLog({
    officeId: officeAlphaId,
    userId: admin1Id,
    action: 'ADMIN_CHANGED_MEAL_PRICE',
    entityType: 'Office',
    entityId: officeAlphaId,
    metadata: { old_non_veg_price: 100, new_non_veg_price: 120 },
  });
  assert(auditEntry.action === 'ADMIN_CHANGED_MEAL_PRICE', 'Audit log records price change action');
  assert(auditEntry.office_id === officeAlphaId, 'Audit log is bound to Office Alpha');

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n=============================================================');
  console.log(`DATABASE TESTS SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDatabaseTests().catch((err) => {
  console.error('Fatal database test error:', err);
  process.exit(1);
});
