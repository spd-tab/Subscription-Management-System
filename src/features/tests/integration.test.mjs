import assert from 'node:assert/strict'
import {
  calculateSubscriptionSubtotal,
  calculatePercentageDiscount,
  calculateFixedDiscount,
  calculateTaxableAmount,
  calculateTax,
  calculateInvoiceTotal,
  calculateNextBillingDate,
  calculateInvoiceLinesSubtotal,
  getLocalDateOnly,
} from '../billing/services/calculationUtils.js'
import {
  canGenerateInvoice,
  transitionSubscription,
  SUBSCRIPTION_STATUSES,
} from '../subscriptions/services/subscriptionLifecycle.js'
import {
  findSubscriptionsDueForBilling,
  validateBillingPeriod,
  determineBillingPeriod,
  prepareInvoiceLineItems,
  calculatePreparedInvoice,
  prepareDueInvoiceRequests,
} from '../billing/services/billingEngine.js'
import { validateSubscriptionDraft } from '../subscriptions/services/subscriptionValidation.js'
import { validateInvoiceDraft } from '../billing/services/invoiceValidation.js'

console.log('─── RUNNING BRIGHTLOOP INTEGRATION TEST SUITE ───\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────
// 1. SUBSCRIPTION CREATION & VALIDATION
// ─────────────────────────────────────────────────────────────
console.log('1. Testing Subscription Creation & Validation:')

test('validateSubscriptionDraft approves valid draft input', () => {
  const plan = { id: 'plan-1', name: 'Starter Monthly', unitPrice: 5000, billingFrequency: 'monthly', billingInterval: 1 }
  const input = {
    customerId: 'cust-1',
    planId: 'plan-1',
    quantity: '2',
    startDate: '2025-01-01',
    billingFrequency: 'monthly',
    billingInterval: 1,
  }
  const error = validateSubscriptionDraft(input, plan)
  assert.equal(error, '', 'Should have no validation error')
})

test('validateSubscriptionDraft rejects missing customer or plan', () => {
  const error = validateSubscriptionDraft({ customerId: '' }, null)
  assert.equal(error, 'Select a customer and a plan.')
})

test('validateSubscriptionDraft rejects invalid date sequence', () => {
  const plan = { id: 'plan-1' }
  const input = {
    customerId: 'cust-1',
    quantity: '1',
    startDate: '2025-05-10',
    expiryDate: '2025-05-01', // Before start
    billingFrequency: 'monthly',
    billingInterval: 1,
  }
  const error = validateSubscriptionDraft(input, plan)
  assert.equal(error, 'Expiry date must be after the start date.')
})

test('calculateNextBillingDate computes monthly, quarterly, and annual dates correctly', () => {
  const monthly = calculateNextBillingDate('2025-01-15', 'monthly', 1)
  assert.equal(monthly, '2025-02-15')

  const quarterly = calculateNextBillingDate('2025-01-15', 'monthly', 3)
  assert.equal(quarterly, '2025-04-15')

  const yearly = calculateNextBillingDate('2025-01-15', 'yearly', 1)
  assert.equal(yearly, '2026-01-15')

  // Month-end clamping (Jan 31 + 1 month -> Feb 28)
  const monthEnd = calculateNextBillingDate('2025-01-31', 'monthly', 1)
  assert.equal(monthEnd, '2025-02-28')
})

// ─────────────────────────────────────────────────────────────
// 2. SUBSCRIPTION LIFECYCLE & STATE MACHINE
// ─────────────────────────────────────────────────────────────
console.log('\n2. Testing Subscription Lifecycle Transitions:')

test('full lifecycle transition from Draft to Closed', () => {
  let sub = {
    id: 'sub-test-01',
    status: 'Draft',
    startDate: '2025-01-01',
    nextBillingDate: '2025-02-01',
    billingFrequency: 'monthly',
    billingInterval: 1,
  }

  assert.equal(canGenerateInvoice(sub), false, 'Draft subscription must not be billable')

  // Draft -> Quotation
  sub = transitionSubscription(sub, 'quotation', '2025-01-02')
  assert.equal(sub.status, 'Quotation')
  assert.equal(canGenerateInvoice(sub), false)

  // Quotation -> Confirmed
  sub = transitionSubscription(sub, 'confirm', '2025-01-03')
  assert.equal(sub.status, 'Confirmed')
  assert.equal(canGenerateInvoice(sub), false)

  // Confirmed -> Active
  sub = transitionSubscription(sub, 'activate', '2025-01-04')
  assert.equal(sub.status, 'Active')
  assert.equal(canGenerateInvoice(sub), true, 'Active subscription must be billable')

  // Active -> Paused
  sub = transitionSubscription(sub, 'pause', '2025-01-10')
  assert.equal(sub.status, 'Paused')
  assert.equal(sub.pausedAt, '2025-01-10')
  assert.equal(canGenerateInvoice(sub), false, 'Paused subscription must not be billable')

  // Paused -> Resumed (Active)
  sub = transitionSubscription(sub, 'resume', '2025-01-15')
  assert.equal(sub.status, 'Active')
  assert.equal(sub.resumedAt, '2025-01-15')
  assert.equal(canGenerateInvoice(sub), true)

  // Renewal advances nextBillingDate
  const prevDate = sub.nextBillingDate
  sub = transitionSubscription(sub, 'renew', '2025-02-01')
  assert.equal(sub.status, 'Active')
  assert.equal(sub.currentPeriodStart, prevDate)
  assert.equal(sub.nextBillingDate, '2025-03-01')

  // Active -> Closed
  sub = transitionSubscription(sub, 'close', '2025-03-01')
  assert.equal(sub.status, 'Closed')
  assert.equal(sub.closedAt, '2025-03-01')
  assert.equal(canGenerateInvoice(sub), false)
})

// ─────────────────────────────────────────────────────────────
// 3. INVOICE CREATION & ACCURATE FINANCIAL CALCULATIONS
// ─────────────────────────────────────────────────────────────
console.log('\n3. Testing Invoice Financial Calculations:')

test('calculateInvoiceTotal computes GST tax, discount, and totals accurately', () => {
  const lineItems = [
    { unitPrice: 25000, quantity: 1 }, // Cloud ERP Suite: 25000
    { unitPrice: 5000, quantity: 2 },  // 2x CRM Pro: 10000
  ]
  const subtotal = calculateInvoiceLinesSubtotal(lineItems)
  assert.equal(subtotal, 35000.00)

  // Apply fixed discount of ₹5,000
  const discountAmount = calculateFixedDiscount(subtotal, 5000)
  assert.equal(discountAmount, 5000.00)

  // Calculate with 18% GST
  const result = calculateInvoiceTotal({
    subtotal,
    discountAmount,
    taxRatePercent: 18,
  })

  assert.equal(result.subtotal, 35000.00)
  assert.equal(result.discountAmount, 5000.00)
  assert.equal(result.taxableAmount, 30000.00)
  assert.equal(result.taxAmount, 5400.00) // 18% of 30,000
  assert.equal(result.total, 35400.00)   // 30,000 + 5,400
})

test('validateInvoiceDraft enforces line item integrity and boundaries', () => {
  const valid = validateInvoiceDraft({
    customerId: 'cust-123',
    items: [{ description: 'Test service', quantity: 1, unitPrice: 1000 }],
    discountType: 'fixed',
    discountValue: 100,
    taxRatePercent: 18,
    subtotal: 1000,
  })
  assert.equal(valid, '')

  const invalidDiscount = validateInvoiceDraft({
    customerId: 'cust-123',
    items: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
    discountType: 'percentage',
    discountValue: 120, // > 100%
    subtotal: 100,
  })
  assert.equal(invalidDiscount, 'Discount value must be within the supported range.')
})

// ─────────────────────────────────────────────────────────────
// 4. RECURRING BILLING ENGINE EVALUATION
// ─────────────────────────────────────────────────────────────
console.log('\n4. Testing Recurring Billing Engine & Due Detection:')

test('findSubscriptionsDueForBilling filters active subscriptions by date', () => {
  const subs = [
    { id: 's1', status: 'Active', startDate: '2025-01-01', currentPeriodStart: '2025-01-01', nextBillingDate: '2025-02-01', billingFrequency: 'monthly', billingInterval: 1 },
    { id: 's2', status: 'Active', startDate: '2025-01-01', currentPeriodStart: '2025-02-01', nextBillingDate: '2025-03-01', billingFrequency: 'monthly', billingInterval: 1 },
    { id: 's3', status: 'Paused', startDate: '2025-01-01', currentPeriodStart: '2025-01-01', nextBillingDate: '2025-02-01', billingFrequency: 'monthly', billingInterval: 1 },
  ]

  const dueFeb = findSubscriptionsDueForBilling(subs, '2025-02-01')
  assert.equal(dueFeb.length, 1)
  assert.equal(dueFeb[0].id, 's1')

  const dueMarch = findSubscriptionsDueForBilling(subs, '2025-03-01')
  assert.equal(dueMarch.length, 2, 'Should include s1 and s2 (paused s3 excluded)')
})

test('prepareDueInvoiceRequests generates complete invoice payloads', () => {
  const subs = [
    {
      id: 'sub-active-01',
      customerId: 'cust-01',
      planName: 'Enterprise Annual',
      quantity: 1,
      unitPrice: 45000,
      currency: 'INR',
      status: 'Active',
      startDate: '2025-01-01',
      currentPeriodStart: '2025-01-01',
      nextBillingDate: '2026-01-01',
      billingFrequency: 'yearly',
      billingInterval: 1,
    },
  ]

  const requests = prepareDueInvoiceRequests(subs, '2026-01-01', {
    resolveBillingRules: () => ({ taxRatePercent: 18 }),
  })

  assert.equal(requests.length, 1)
  const req = requests[0]
  assert.equal(req.subscriptionId, 'sub-active-01')
  assert.equal(req.currency, 'INR')
  assert.equal(req.subtotal, 45000.00)
  assert.equal(req.taxAmount, 8100.00) // 18% of 45000
  assert.equal(req.total, 53100.00)
  assert.equal(req.period.startDate, '2025-01-01')
  assert.equal(req.period.endDateExclusive, '2026-01-01')
  assert.equal(req.period.nextPeriodDate, '2027-01-01')
})

// ─────────────────────────────────────────────────────────────
// 5. PAYMENT RECONCILIATION SIMULATION
// ─────────────────────────────────────────────────────────────
console.log('\n5. Testing Payment Reconciliation & Status Transitions:')

test('partial and full payment reconciliation on invoice balances', () => {
  const invoice = {
    id: 'INV-2025-001',
    total_amount: 53100.00,
    amount_paid: 0.00,
    status: 'draft',
  }

  // Payment 1: Partial advance payment ₹20,000
  const payment1 = { amount: 20000.00 }
  invoice.amount_paid += payment1.amount
  invoice.status = invoice.amount_paid >= invoice.total_amount ? 'paid' : 'confirmed'
  const outstanding1 = invoice.total_amount - invoice.amount_paid

  assert.equal(invoice.amount_paid, 20000.00)
  assert.equal(outstanding1, 33100.00)
  assert.equal(invoice.status, 'confirmed')

  // Payment 2: Settlement payment ₹33,100
  const payment2 = { amount: 33100.00 }
  invoice.amount_paid += payment2.amount
  invoice.status = invoice.amount_paid >= invoice.total_amount ? 'paid' : 'confirmed'
  const outstanding2 = invoice.total_amount - invoice.amount_paid

  assert.equal(invoice.amount_paid, 53100.00)
  assert.equal(outstanding2, 0.00)
  assert.equal(invoice.status, 'paid', 'Invoice must transition to paid once fully settled')
})

console.log(`\n─── TEST RESULTS: ${passed} passed, ${failed} failed ───\n`)
if (failed > 0) process.exit(1)
