import { supabase } from '../../../services/supabase/client.js'
import { calculateNextBillingDate, calculatePreviousBillingDate, getLocalDateOnly } from '../../billing/services/calculationUtils.js'
import { validateSubscriptionDraft } from './subscriptionValidation.js'

const PLAN_ITEMS_SELECT = 'id,product_id,variant_id,quantity,unit_price,tax_rate_id,product:products(id,name),variant:product_variants(name),taxRate:tax_rates(rate_percent)'
const PLAN_SELECT = `id,name,billing_interval,interval_count,minimum_quantity,available_from,available_until,is_active,plan_items(${PLAN_ITEMS_SELECT})`
const SUBSCRIPTION_SELECT = `*,customer:customers(id,name,email),plan:plans(${PLAN_SELECT}),items:subscription_items(id,product_id,variant_id,description,quantity,unit_price,tax_rate_id,tax_rate_percent,product:products(name),variant:product_variants(name))`
const PAGE_SIZE = 500
const STATUS_FROM_DATABASE = Object.freeze({
  draft: 'Draft',
  quotation: 'Quotation',
  confirmed: 'Confirmed',
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
})
const STATUS_TO_DATABASE = Object.freeze(Object.fromEntries(
  Object.entries(STATUS_FROM_DATABASE).map(([databaseStatus, displayStatus]) => [displayStatus, databaseStatus]),
))
const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  draft: ['quotation'],
  quotation: ['confirmed'],
  confirmed: ['active'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: [],
})

function assertQuery(result, operation) {
  if (result.error) {
    const error = new Error(`${operation}: ${result.error.message}`, { cause: result.error })
    error.code = result.error.code
    throw error
  }
  return result.data
}

async function fetchAll(queryFactory, operation) {
  const records = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await queryFactory().range(offset, offset + PAGE_SIZE - 1)
    const page = assertQuery(result, operation) ?? []
    records.push(...page)
    if (page.length < PAGE_SIZE) return records
  }
}

function normalizePlanItem(item) {
  return {
    id: item.id,
    productId: item.product_id,
    productName: item.product?.name ?? item.description ?? 'Plan item',
    variantId: item.variant_id,
    variantName: item.variant?.name ?? null,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    taxRateId: item.tax_rate_id,
    taxRatePercent: Number(item.taxRate?.rate_percent ?? 0),
  }
}

function normalizePlan(record) {
  const items = (record.plan_items ?? []).map(normalizePlanItem)
  return {
    id: record.id,
    name: record.name,
    billingFrequency: record.billing_interval,
    billingInterval: Number(record.interval_count),
    minimumQuantity: Number(record.minimum_quantity),
    currency: 'INR',
    unitPrice: items.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
    items,
  }
}

function normalizeSubscription(record) {
  const planItems = record.plan?.plan_items ?? []
  const items = (record.items ?? []).map((item) => ({
    id: item.id,
    productId: item.product_id,
    variantId: item.variant_id,
    description: item.description || [item.product?.name, item.variant?.name].filter(Boolean).join(' · ') || 'Subscription item',
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    taxRateId: item.tax_rate_id,
    taxRatePercent: Number(item.tax_rate_percent ?? 0),
  }))
  const firstItem = items[0]
  const basePlanItem = planItems.find((item) => item.product_id === firstItem?.productId && item.variant_id === firstItem?.variantId)
  const quantity = firstItem && basePlanItem && Number(basePlanItem.quantity) > 0
    ? Number(firstItem.quantity) / Number(basePlanItem.quantity)
    : 1
  const billingFrequency = record.billing_interval
  const billingInterval = Number(record.interval_count)
  const startDate = record.start_date
  const nextBillingDate = record.next_billing_date

  return {
    id: record.id,
    subscriptionNumber: record.subscription_number,
    customerId: record.customer_id,
    customerName: record.customer?.name ?? 'Customer',
    customerEmail: record.customer?.email ?? '',
    planId: record.plan_id,
    planName: record.plan?.name ?? 'Plan',
    status: STATUS_FROM_DATABASE[record.status] ?? record.status,
    startDate,
    expiryDate: record.end_date,
    billingFrequency,
    billingInterval,
    nextBillingDate,
    currentPeriodStart: nextBillingDate
      ? calculatePreviousBillingDate(nextBillingDate, billingFrequency, billingInterval, startDate)
      : startDate,
    currentPeriodEnd: nextBillingDate,
    quantity,
    unitPrice: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0) / (quantity || 1),
    currency: record.currency?.trim() || 'INR',
    items,
    autoClose: record.auto_close,
    paymentTermsDays: Number(record.payment_terms_days),
    pausedAt: record.paused_at,
    closedAt: record.closed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function createNumber(prefix) {
  if (!globalThis.crypto?.randomUUID) throw new Error('A secure browser UUID generator is required to create a unique record number.')
  return `${prefix}-${getLocalDateOnly().replaceAll('-', '')}-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

async function removeSubscriptionAfterFailure(client, id, originalError) {
  const rollback = await client.from('subscriptions').delete().eq('id', id)
  if (rollback.error) {
    throw new AggregateError(
      [originalError, rollback.error],
      `Subscription creation failed and its incomplete database record could not be removed: ${rollback.error.message}`,
    )
  }
  throw originalError
}

export function createSupabaseSubscriptionAdapter(client = supabase) {
  if (!client) throw new Error('Supabase is not configured.')

  return {
    async list({ search = '', status = 'all' } = {}) {
      const records = await fetchAll(
        () => client.from('subscriptions').select(SUBSCRIPTION_SELECT).order('created_at', { ascending: false }),
        'Unable to load subscriptions',
      )
      const normalizedSearch = search.trim().toLowerCase()
      return records.map(normalizeSubscription).filter((record) => {
        const matchesSearch = `${record.subscriptionNumber} ${record.customerName} ${record.planName} ${record.id}`.toLowerCase().includes(normalizedSearch)
        const matchesStatus = status === 'all' || record.status.toLowerCase() === status.toLowerCase()
        return matchesSearch && matchesStatus
      })
    },

    async getById(id) {
      const result = await client.from('subscriptions').select(SUBSCRIPTION_SELECT).eq('id', id).maybeSingle()
      const record = assertQuery(result, 'Unable to load subscription details')
      return record ? normalizeSubscription(record) : null
    },

    async listCustomers() {
      return fetchAll(
        () => client.from('customers').select('id,name,email').order('name', { ascending: true }),
        'Unable to load customers',
      )
    },

    async listPlans() {
      const today = getLocalDateOnly()
      const records = await fetchAll(
        () => client.from('plans').select(PLAN_SELECT).eq('is_active', true).order('name', { ascending: true }),
        'Unable to load plans',
      )
      return records
        .filter((record) => (!record.available_from || record.available_from <= today) && (!record.available_until || record.available_until >= today))
        .map(normalizePlan)
        .filter((plan) => plan.items.length > 0)
    },

    async create(input) {
      const customerResult = await client.from('customers').select('id').eq('id', input.customerId).single()
      assertQuery(customerResult, 'Unable to verify the selected customer')
      const planResult = await client.from('plans').select(PLAN_SELECT).eq('id', input.planId).eq('is_active', true).single()
      const plan = normalizePlan(assertQuery(planResult, 'Unable to verify the selected plan'))
      if (!plan.items.length) throw new Error('The selected plan has no configured products and cannot be subscribed to.')
      const validationError = validateSubscriptionDraft(input, plan)
      if (validationError) throw new Error(validationError)
      if (!Number.isInteger(Number(input.quantity)) || Number(input.quantity) < plan.minimumQuantity) {
        throw new Error(`The selected plan requires a minimum quantity of ${plan.minimumQuantity}.`)
      }

      const startDate = input.startDate
      const frequency = input.billingFrequency || plan.billingFrequency
      const interval = Number(input.billingInterval || plan.billingInterval)
      const nextBillingDate = calculateNextBillingDate(startDate, frequency, interval)
      const record = {
        subscription_number: createNumber('SUB'),
        customer_id: input.customerId,
        plan_id: input.planId,
        status: 'draft',
        start_date: startDate,
        end_date: input.expiryDate || null,
        next_billing_date: nextBillingDate,
        billing_interval: frequency,
        interval_count: interval,
        currency: 'INR',
      }
      const subscriptionResult = await client.from('subscriptions').insert(record).select('id').single()
      const created = assertQuery(subscriptionResult, 'Unable to create subscription')
      const itemRecords = plan.items.map((item) => ({
        subscription_id: created.id,
        product_id: item.productId,
        variant_id: item.variantId,
        description: item.productName + (item.variantName ? ` · ${item.variantName}` : ''),
        quantity: item.quantity * Number(input.quantity),
        unit_price: item.unitPrice,
        tax_rate_id: item.taxRateId,
        tax_rate_percent: item.taxRatePercent,
      }))
      const itemsResult = await client.from('subscription_items').insert(itemRecords)
      if (itemsResult.error) return removeSubscriptionAfterFailure(client, created.id, new Error(`Unable to save subscription items: ${itemsResult.error.message}`, { cause: itemsResult.error }))
      return this.getById(created.id)
    },

    async update(id, changes) {
      const record = {}
      if (changes.status && !STATUS_TO_DATABASE[changes.status]) throw new Error(`Unsupported subscription status "${changes.status}".`)
      const currentResult = await client.from('subscriptions').select('status,next_billing_date').eq('id', id).single()
      const current = assertQuery(currentResult, 'Unable to verify current subscription status')
      if (changes.status) {
        const nextStatus = STATUS_TO_DATABASE[changes.status]
        if (nextStatus !== current.status && !ALLOWED_STATUS_TRANSITIONS[current.status]?.includes(nextStatus)) {
          throw new Error(`Cannot change a ${STATUS_FROM_DATABASE[current.status] ?? current.status} subscription to ${changes.status}.`)
        }
      }
      if (changes.status) record.status = STATUS_TO_DATABASE[changes.status]
      if (changes.status === 'Active') record.paused_at = null
      if ('nextBillingDate' in changes) record.next_billing_date = changes.nextBillingDate
      if ('expiryDate' in changes) record.end_date = changes.expiryDate
      if ('pausedAt' in changes) record.paused_at = changes.pausedAt ? `${changes.pausedAt}T00:00:00.000Z` : null
      if ('closedAt' in changes) record.closed_at = changes.closedAt ? `${changes.closedAt}T00:00:00.000Z` : null
      if (Object.keys(record).length === 0) return this.getById(id)
      let update = client.from('subscriptions').update(record).eq('id', id).eq('status', current.status)
      if (changes.nextBillingDate !== current.next_billing_date && changes.currentPeriodStart) {
        update = update.eq('next_billing_date', changes.currentPeriodStart)
      }
      const result = await update.select('id').maybeSingle()
      const updated = assertQuery(result, 'Unable to update subscription')
      if (!updated) throw new Error('The subscription changed during this action. Reload it and try again.')
      return this.getById(id)
    },
  }
}
