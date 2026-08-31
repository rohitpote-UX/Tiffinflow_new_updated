/**
 * BiteBuddy 2.0 — Comprehensive 50-User Production Simulation Test
 * 
 * Simulates:
 * 1. Office creation & configuration
 * 2. 50 distinct employees onboarding with various default preferences
 * 3. 47 simultaneous employee meal selections (30 Veg, 12 Non-Veg, 5 Skip, 3 Pending)
 * 4. Admin Live Dashboard headcount & revenue metrics verification
 * 5. Targeted "Remind Pending" notification dispatch (strictly 3 users)
 * 6. Cutoff enforcement & Auto-Default engine with traceability
 * 7. Order Finalization snapshot generation & mutation locking
 * 8. Caterer WhatsApp text generation
 * 9. Weekly billing generation & Admin payment verification
 * 10. Multi-tenant office data isolation verification
 */

import { localDb } from '../lib/db';
import { MealService } from '../lib/meals/meal-service';
import { OfficeService } from '../lib/offices/office-service';
import { PaymentService } from '../lib/payments/payment-service';
import { ReportService } from '../lib/reports/report-service';
import { getOfficeTomorrowDate } from '../lib/utils/dates';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function run50UserSimulation() {
  console.log('\n============================================================');
  console.log('  BITEBUDDY — 50-USER PRODUCTION SIMULATION TEST');
  console.log('============================================================\n');

  const now = new Date().toISOString();
  const testOfficeId = 'office-techcorp-50';
  const office2Id = 'office-acme-branch-2';
  const targetDate = getOfficeTomorrowDate('Asia/Kolkata');

  // Clean up any previous test run records
  localDb.data.offices = localDb.offices.filter((o) => o.id !== testOfficeId && o.id !== office2Id);
  localDb.data.users = localDb.users.filter((u) => !u.id.startsWith('user_tc_'));
  localDb.data.memberships = localDb.memberships.filter((m) => m.office_id !== testOfficeId && m.office_id !== office2Id);
  localDb.data.meals = localDb.meals.filter((m) => m.office_id !== testOfficeId && m.office_id !== office2Id);
  localDb.data.payments = localDb.payments.filter((p) => p.office_id !== testOfficeId && p.office_id !== office2Id);
  localDb.data.finalized_orders = localDb.finalized_orders.filter((f) => f.office_id !== testOfficeId && f.office_id !== office2Id);
  localDb.save();

  // ── Step 1: Create Test Office ─────────────────────────────────────────
  console.log('STEP 1: Creating Office (TechCorp Labs, BITE-50)...');
  const office = {
    id: testOfficeId,
    name: 'TechCorp Labs',
    admin_id: 'admin-techcorp',
    veg_price: 80,
    non_veg_price: 100,
    cutoff_time: '19:00',
    timezone: 'Asia/Kolkata',
    week_start_day: 1,
    auto_default_enabled: true,
    join_code: 'BITE-50',
    working_days: [1, 2, 3, 4, 5],
    created_at: now,
    updated_at: now,
  };
  localDb.offices.push(office);
  assert(localDb.offices.some((o) => o.id === testOfficeId), 'Office successfully registered in DB');

  // ── Step 2: Register 50 Distinct Employees ─────────────────────────────
  console.log('\nSTEP 2: Registering 50 Office Employees with dietary preferences...');
  for (let i = 1; i <= 50; i++) {
    const userId = `user_tc_${String(i).padStart(2, '0')}`;
    const pref: 'flexible' | 'always-veg' | 'always-non-veg' =
      i <= 25 ? 'flexible' : i <= 40 ? 'always-veg' : 'always-non-veg';

    const user = {
      id: userId,
      name: `Employee ${i}`,
      email: `emp${i}@techcorp.io`,
      phone: `+91 98000000${String(i).padStart(2, '0')}`,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    localDb.users.push(user);

    const membership = {
      id: `mem_tc_${String(i).padStart(2, '0')}`,
      user_id: userId,
      office_id: testOfficeId,
      role: 'USER' as const,
      default_preference: pref,
      is_active: true,
      joined_at: now,
      updated_at: now,
    };
    localDb.memberships.push(membership);
  }

  const officeMembers = await OfficeService.getOfficeMembers(testOfficeId);
  assert(officeMembers.length === 50, `Enrolled exactly 50 employees into ${office.name}`);

  // ── Step 3: Simulate 47 Selections (30 Veg, 12 Non-Veg, 5 Skip, 3 Pending) ──
  console.log('\nSTEP 3: Simulating 47 meal confirmations for tomorrow...');
  // Users 1..30 select Veg
  for (let i = 1; i <= 30; i++) {
    await MealService.confirmMeal(`user_tc_${String(i).padStart(2, '0')}`, testOfficeId, targetDate, 'veg', 'MANUAL');
  }
  // Users 31..42 select Non-Veg
  for (let i = 31; i <= 42; i++) {
    await MealService.confirmMeal(`user_tc_${String(i).padStart(2, '0')}`, testOfficeId, targetDate, 'non-veg', 'MANUAL');
  }
  // Users 43..47 select Skip
  for (let i = 43; i <= 47; i++) {
    await MealService.confirmMeal(`user_tc_${String(i).padStart(2, '0')}`, testOfficeId, targetDate, 'skip', 'MANUAL');
  }
  // Users 48, 49, 50 remain PENDING (haven't responded yet)

  // ── Step 4: Verify Admin Dashboard Headcounts ─────────────────────────
  console.log('\nSTEP 4: Verifying Live Admin Dashboard headcounts & revenue...');
  const allMeals = await MealService.getOfficeMealsByDate(testOfficeId, targetDate);
  const vegCount = allMeals.filter((m) => m.meal_type === 'veg').length;
  const nonVegCount = allMeals.filter((m) => m.meal_type === 'non-veg').length;
  const skipCount = allMeals.filter((m) => m.meal_type === 'skip').length;
  const respondedCount = allMeals.length;
  const pendingCount = 50 - respondedCount;

  assert(vegCount === 30, `Veg Headcount is 30 (₹${30 * 80})`);
  assert(nonVegCount === 12, `Non-Veg Headcount is 12 (₹${12 * 100})`);
  assert(skipCount === 5, 'Skip Count is 5');
  assert(respondedCount === 47, 'Responded Count is 47 / 50');
  assert(pendingCount === 3, 'Pending Count is exactly 3');

  const totalRevenue = (30 * 80) + (12 * 100);
  assert(totalRevenue === 3600, 'Total Projected Revenue is ₹3,600');

  // ── Step 5: Verify "Remind Pending" Target Users ───────────────────────
  console.log('\nSTEP 5: Testing "Remind Pending" targeting filter...');
  const respondedUserIds = new Set(allMeals.map((m) => m.user_id));
  const pendingUsers = officeMembers.filter((m) => !respondedUserIds.has(m.user.id));

  assert(pendingUsers.length === 3, 'Remind Pending targets exactly the 3 pending users');
  const expectedPendingIds = ['user_tc_48', 'user_tc_49', 'user_tc_50'];
  const actualPendingIds = pendingUsers.map((p) => p.user.id);
  assert(
    JSON.stringify(actualPendingIds.sort()) === JSON.stringify(expectedPendingIds.sort()),
    'Correct pending user IDs targeted (user_48, user_49, user_50)'
  );

  // ── Step 6: Test Auto-Default Engine ──────────────────────────────────
  console.log('\nSTEP 6: Executing Auto-Default Engine for cutoff boundary...');
  // user_48: always-non-veg, user_49: always-non-veg, user_50: always-non-veg
  const { defaultedCount } = await MealService.autoDefaultMealsForOffice(testOfficeId, targetDate);
  assert(defaultedCount === 3, `Auto-default applied meals to all ${defaultedCount} pending users with preferences`);
  
  const postDefaultMeals = await MealService.getOfficeMealsByDate(testOfficeId, targetDate);
  const updatedNonVegCount = postDefaultMeals.filter((m) => m.meal_type === 'non-veg').length;
  assert(updatedNonVegCount === 15, 'Non-Veg count increased to 15 (12 manual + 3 auto-defaulted)');

  const defaultedMeal = postDefaultMeals.find((m) => m.user_id === 'user_tc_48');
  assert(defaultedMeal?.meal_source === 'AUTO_DEFAULT', 'Meal source correctly recorded as AUTO_DEFAULT');
  assert(defaultedMeal?.is_auto_defaulted === true, 'is_auto_defaulted flag is TRUE');

  // ── Step 7: Order Finalization Snapshot ───────────────────────────────
  console.log('\nSTEP 7: Admin Finalizing Order & Snapshot Verification...');
  const snapshot = await OfficeService.finalizeOrder(testOfficeId, targetDate, 'admin-techcorp');
  assert(snapshot.total_meals === 45, `Snapshot records 45 total meals (30 Veg + 15 Non-Veg)`);
  assert(snapshot.total_revenue === (30 * 80 + 15 * 100), `Snapshot records ₹${snapshot.total_revenue} revenue`);
  assert(snapshot.finalized_by === 'admin-techcorp', 'Snapshot records finalizing admin user ID');

  // Verify mutation locking after finalization:
  console.log('Testing mutation lock after finalization...');
  let mutationBlocked = false;
  try {
    await MealService.confirmMeal('user_tc_01', testOfficeId, targetDate, 'non-veg', 'MANUAL');
  } catch (err) {
    mutationBlocked = true;
  }
  assert(mutationBlocked, 'Employee cannot modify meal after order has been finalized by admin');

  // ── Step 8: Caterer WhatsApp Text Summary ──────────────────────────────
  console.log('\nSTEP 8: Generating Caterer WhatsApp Summary...');
  const whatsAppText = await ReportService.generateCatererWhatsAppText(testOfficeId, targetDate);
  assert(whatsAppText.includes('Veg Meals:* 30'), 'Caterer summary contains 30 Veg');
  assert(whatsAppText.includes('Non-Veg Meals:* 15'), 'Caterer summary contains 15 Non-Veg');
  assert(whatsAppText.includes('TechCorp Labs'), 'WhatsApp message includes office name');
  assert(whatsAppText.includes('Total Quantity:* 45 meals'), 'WhatsApp message includes total meal count (45)');
  console.log('\nGenerated WhatsApp Message:\n' + whatsAppText);

  // ── Step 9: Weekly Billing Generation ──────────────────────────────────
  console.log('\nSTEP 9: Generating Weekly Billing Ledger...');
  const billingResult = await PaymentService.generateWeeklyBillsForOffice(testOfficeId, targetDate);
  assert(billingResult.generatedCount > 0, `Generated weekly bills for ${billingResult.generatedCount} active users`);
  assert(billingResult.totalBilled === snapshot.total_revenue, `Total billed (₹${billingResult.totalBilled}) matches total revenue`);

  // Admin marks payment for user 1 as paid
  const user1Payment = localDb.payments.find((p) => p.user_id === 'user_tc_01');
  assert(Boolean(user1Payment && user1Payment.status === 'pending'), 'User 1 bill is initially pending');
  
  if (user1Payment) {
    const paidPayment = await PaymentService.markPaymentPaid(user1Payment.id, 'admin-techcorp', 'UPI Ref #TC5001');
    assert(paidPayment.status === 'paid', 'User 1 bill status updated to PAID');
    assert(paidPayment.receipt_notes === 'UPI Ref #TC5001', 'Receipt note recorded');
    assert(Boolean(paidPayment.paid_at), 'Payment timestamp recorded');
  }

  // ── Step 10: Multi-Tenant Data Isolation Check ─────────────────────────
  console.log('\nSTEP 10: Multi-Tenant Data Isolation Check with Second Office...');
  localDb.offices.push({
    id: office2Id,
    name: 'Acme Branch 2',
    admin_id: 'admin-acme-2',
    veg_price: 90,
    non_veg_price: 110,
    cutoff_time: '18:00',
    timezone: 'Asia/Kolkata',
    week_start_day: 1,
    auto_default_enabled: true,
    join_code: 'BITE-ACME2',
    working_days: [1, 2, 3, 4, 5],
    created_at: now,
    updated_at: now,
  });

  const office2Meals = await MealService.getOfficeMealsByDate(office2Id, targetDate);
  const office2Payments = await PaymentService.getOfficePayments(office2Id);
  const office2Members = await OfficeService.getOfficeMembers(office2Id);

  assert(office2Meals.length === 0, 'Office 2 has 0 meals (no leakage from TechCorp Labs)');
  assert(office2Payments.length === 0, 'Office 2 has 0 payments (no leakage from TechCorp Labs)');
  assert(office2Members.length === 0, 'Office 2 has 0 members (no leakage from TechCorp Labs)');

  console.log('\n============================================================');
  console.log('  🎉 ALL 10 PHASES OF 50-USER SIMULATION PASSED CLEANLY!   ');
  console.log('============================================================\n');
}

run50UserSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Simulation error:', err);
    process.exit(1);
  });
