import { canGenerateInvoice } from '../../subscriptions/services/subscriptionLifecycle.js'
import { calculateDiscountAmount, calculateInvoiceItemTotals, calculateInvoiceLinesSubtotal, calculateNextBillingDate, isValidDateOnly } from './calculationUtils.js'

export function findSubscriptionsDueForBilling(subscriptions, asOfDate) {
  if (!Array.isArray(subscriptions)) throw new TypeError('Subscriptions must be an array.')
  if (!isValidDateOnly(asOfDate)) throw new TypeError('Billing date must be a real calendar date in YYYY-MM-DD format.')
  return subscriptions.filter((subscription) => {
    if (!canGenerateInvoice(subscription)) return false
    validateBillingPeriod(subscription)
    return subscription.nextBillingDate <= asOfDate &&
      (!subscription.expiryDate || subscription.expiryDate >= subscription.nextBillingDate)
  })
}

export function validateBillingPeriod(subscription) {
  if (!canGenerateInvoice(subscription)) throw new Error(`A ${subscription?.status ?? 'unknown'} subscription cannot be billed.`)
  if (!isValidDateOnly(subscription.startDate) ||
      !isValidDateOnly(subscription.currentPeriodStart) ||
      !isValidDateOnly(subscription.nextBillingDate) ||
      (subscription.expiryDate !== null && subscription.expiryDate !== undefined && !isValidDateOnly(subscription.expiryDate))) {
    throw new Error('Subscription start, current period, next billing, and expiry dates must be valid calendar dates.')
  }
  if (!subscription.billingFrequency) {
    throw new Error('Subscription period start, billing frequency, and next billing date are required.')
  }
  if (subscription.expiryDate && subscription.expiryDate <= subscription.startDate) {
    throw new Error('Subscription expiry date must be after its start date.')
  }
  if (subscription.currentPeriodStart < subscription.startDate || subscription.nextBillingDate <= subscription.currentPeriodStart) {
    throw new Error('Subscription billing period dates are out of order.')
  }
  const expectedDueDate = calculateNextBillingDate(
    subscription.currentPeriodStart,
    subscription.billingFrequency,
    subscription.billingInterval ?? 1,
    subscription.startDate,
  )
  if (expectedDueDate !== subscription.nextBillingDate) {
    throw new Error('Subscription next billing date does not match its billing frequency and period start.')
  }
  return {
    startDate: subscription.currentPeriodStart,
    endDateExclusive: subscription.nextBillingDate,
  }
}

export function determineBillingPeriod(subscription) {
  const period = validateBillingPeriod(subscription)
  const nextDate = calculateNextBillingDate(subscription.nextBillingDate, subscription.billingFrequency, subscription.billingInterval ?? 1, subscription.startDate)
  return {
    ...period,
    nextPeriodDate: nextDate,
  }
}

export function prepareInvoiceLineItems(subscription, period = determineBillingPeriod(subscription)) {
  if (!canGenerateInvoice(subscription)) throw new Error(`A ${subscription?.status ?? 'unknown'} subscription cannot generate invoice items.`)
  const sourceItems = Array.isArray(subscription.items) && subscription.items.length
    ? subscription.items
    : [{ description: subscription.planName ?? 'Subscription', quantity: subscription.quantity ?? 1, unitPrice: subscription.unitPrice }]
  return sourceItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    productId: item.productId ?? item.product_id ?? null,
    variantId: item.variantId ?? item.variant_id ?? null,
    taxRatePercent: Number(item.taxRatePercent ?? item.tax_rate_percent ?? 0),
    amount: calculateInvoiceLinesSubtotal([item]),
    periodStart: period.startDate,
    periodEndExclusive: period.endDateExclusive,
  }))
}

export function calculatePreparedInvoice(subscription, { discountAmount, discount, taxRatePercent = 0 } = {}) {
  const period = determineBillingPeriod(subscription)
  const items = prepareInvoiceLineItems(subscription, period)
  const subtotal = calculateInvoiceLinesSubtotal(items)
  const appliedDiscount = discount ? calculateDiscountAmount(subtotal, discount) : discountAmount ?? 0
  return {
    period,
    ...calculateInvoiceItemTotals(items, appliedDiscount, taxRatePercent),
  }
}

export function prepareDueInvoiceRequests(subscriptions, asOfDate, { resolveBillingRules } = {}) {
  if (!isValidDateOnly(asOfDate)) throw new TypeError('Billing date must be a real calendar date in YYYY-MM-DD format.')
  return findSubscriptionsDueForBilling(subscriptions, asOfDate).map((subscription) => {
    const billingRules = resolveBillingRules?.(subscription) ?? {}
    return {
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      currency: subscription.currency,
      asOfDate,
      ...calculatePreparedInvoice(subscription, billingRules),
    }
  })
}

export async function requestInvoiceGeneration(subscriptions, asOfDate, options = {}, service) {
  const requests = prepareDueInvoiceRequests(subscriptions, asOfDate, options)
  if (requests.length === 0) return { requested: 0, results: [] }
  const invoiceService = service ?? (await import('./invoiceService.js')).invoiceService
  if (typeof invoiceService.requestGeneration !== 'function') throw new TypeError('Invoice service must implement requestGeneration.')
  return invoiceService.requestGeneration({ asOfDate })
}

export async function requestDueInvoiceGeneration(asOfDate, options = {}) {
  const [{ subscriptionService }, { invoiceService }] = await Promise.all([
    import('../../subscriptions/services/subscriptionService.js'),
    import('./invoiceService.js'),
  ])
  const subscriptions = await subscriptionService.list({ status: 'Active' })
  const preview = prepareDueInvoiceRequests(subscriptions, asOfDate, options)
  const result = await invoiceService.requestGeneration({ asOfDate })
  return { previewCount: preview.length, result }
}
