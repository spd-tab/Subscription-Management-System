import { calculateNextBillingDate, getLocalDateOnly, isValidDateOnly } from '../../billing/services/calculationUtils.js'

export const SUBSCRIPTION_STATUSES = Object.freeze(['Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed'])

const transitions = Object.freeze({
  quotation: { Draft: 'Quotation' },
  confirm: { Quotation: 'Confirmed' },
  activate: { Confirmed: 'Active' },
  close: { Active: 'Closed', Paused: 'Closed' },
})

export class SubscriptionLifecycleError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SubscriptionLifecycleError'
  }
}

export function canGenerateInvoice(subscription) {
  return subscription?.status === 'Active'
}

export function transitionSubscription(subscription, action, today = getLocalDateOnly()) {
  if (!subscription || !SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    throw new SubscriptionLifecycleError('A subscription with a recognized status is required.')
  }
  if (!isValidDateOnly(today)) throw new SubscriptionLifecycleError('Lifecycle action date must be a valid calendar date.')

  if (action === 'pause') {
    if (subscription.status !== 'Active') throw new SubscriptionLifecycleError('Only an active subscription can be paused.')
    return { ...subscription, status: 'Paused', pausedAt: today }
  }

  if (action === 'resume') {
    if (subscription.status !== 'Paused') throw new SubscriptionLifecycleError('Only a paused subscription can be resumed.')
    return { ...subscription, status: 'Active', resumedAt: today }
  }

  if (action === 'renew') {
    if (subscription.status !== 'Active') throw new SubscriptionLifecycleError('Only an active subscription can be renewed. Resume a paused subscription first.')
    if (!subscription.nextBillingDate || !subscription.billingFrequency) {
      throw new SubscriptionLifecycleError('Billing date and frequency are required to renew this subscription.')
    }
    if (!isValidDateOnly(subscription.startDate) || !isValidDateOnly(subscription.nextBillingDate)) {
      throw new SubscriptionLifecycleError('Subscription start and next billing dates must be valid calendar dates to renew.')
    }
    const nextBillingDate = calculateNextBillingDate(subscription.nextBillingDate, subscription.billingFrequency, subscription.billingInterval ?? 1, subscription.startDate ?? subscription.nextBillingDate)
    return { ...subscription, currentPeriodStart: subscription.nextBillingDate, currentPeriodEnd: nextBillingDate, nextBillingDate, renewedAt: today }
  }

  const status = transitions[action]?.[subscription.status]
  if (!status) throw new SubscriptionLifecycleError(`Action "${action}" is not valid for a ${subscription.status} subscription.`)

  return { ...subscription, status, ...(status === 'Closed' ? { closedAt: today } : {}) }
}
