import { supabase, isSupabaseConfigured } from '../../services/supabase/client.js'
import { configureSubscriptionAdapter } from '../subscriptions/services/subscriptionService.js'
import { configureInvoiceAdapter } from '../billing/services/invoiceService.js'
import { developmentCustomers, developmentPlans, developmentSubscriptions } from '../subscriptions/data/developmentData.js'
import { developmentInvoices } from '../billing/data/developmentInvoices.js'
import { getLocalDateOnly } from '../billing/services/calculationUtils.js'

let localSubscriptions = structuredClone(developmentSubscriptions)
let localInvoices = structuredClone(developmentInvoices)

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function normalizeDbSubscription(sub) {
  const planItem = sub.items?.[0]
  const unitPrice = Number(planItem?.unit_price ?? sub.plan?.plan_items?.[0]?.unit_price ?? 0)
  const quantity = Number(planItem?.quantity ?? 1)

  return {
    id: sub.id,
    subscriptionNumber: sub.subscription_number,
    customerName: sub.customer?.name || 'Customer',
    customerId: sub.customer_id,
    planName: sub.plan?.name || 'Custom Plan',
    planId: sub.plan_id,
    quantity,
    unitPrice,
    currency: sub.currency || 'INR',
    billingFrequency: sub.billing_interval || 'monthly',
    billingInterval: sub.interval_count || 1,
    startDate: sub.start_date,
    expiryDate: sub.end_date || null,
    nextBillingDate: sub.next_billing_date,
    currentPeriodStart: sub.start_date,
    currentPeriodEnd: sub.next_billing_date,
    status: capitalize(sub.status),
    note: sub.subscription_number ? `#${sub.subscription_number}` : '',
  }
}

function normalizeDbInvoice(inv) {
  const items = (inv.items || []).map((i) => ({
    id: i.id,
    description: i.description || 'Service Line Item',
    quantity: Number(i.quantity || 1),
    unitPrice: Number(i.unit_price || 0),
    amount: Number(i.total_amount || (Number(i.quantity || 1) * Number(i.unit_price || 0))),
  }))

  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    customerId: inv.customer_id,
    customerName: inv.customer?.name || 'Customer',
    subscriptionId: inv.subscription_id || null,
    currency: inv.currency || 'INR',
    status: capitalize(inv.status),
    issuedAt: inv.issue_date,
    dueAt: inv.due_date,
    items: items.length > 0 ? items : [{ description: 'Subscription Billing', quantity: 1, unitPrice: Number(inv.subtotal || 0), amount: Number(inv.total_amount || 0) }],
    subtotal: Number(inv.subtotal || 0),
    discountAmount: Number(inv.discount_amount || 0),
    taxableAmount: Number(inv.subtotal || 0) - Number(inv.discount_amount || 0),
    taxAmount: Number(inv.tax_amount || 0),
    total: Number(inv.total_amount || 0),
    amountPaid: Number(inv.amount_paid || 0),
    note: inv.status === 'paid' ? 'Paid in full' : (inv.amount_paid > 0 ? `Partial payment: ₹${inv.amount_paid}` : null),
  }
}

export const supabaseSubscriptionAdapter = {
  async list({ search = '', status = 'all' } = {}) {
    if (!isSupabaseConfigured || !supabase) {
      return filterLocalSubscriptions(search, status)
    }

    try {
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          customer:customers(id, name, email),
          plan:plans(id, name, plan_items(unit_price)),
          items:subscription_items(*)
        `)
        .order('created_at', { ascending: false })

      if (status !== 'all') {
        query = query.eq('status', status.toLowerCase())
      }

      const { data, error } = await query
      if (error || !data || data.length === 0) {
        return filterLocalSubscriptions(search, status)
      }

      let results = data.map(normalizeDbSubscription)
      if (search) {
        const q = search.trim().toLowerCase()
        results = results.filter((s) => `${s.customerName} ${s.planName} ${s.id} ${s.subscriptionNumber || ''}`.toLowerCase().includes(q))
      }
      return results
    } catch {
      return filterLocalSubscriptions(search, status)
    }
  },

  async getById(id) {
    if (!isSupabaseConfigured || !supabase) {
      return localSubscriptions.find((s) => s.id === id || s.subscriptionNumber === id) ?? null
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          customer:customers(id, name, email),
          plan:plans(id, name, plan_items(unit_price)),
          items:subscription_items(*)
        `)

      if (isUuid) {
        query = query.eq('id', id)
      } else {
        query = query.eq('subscription_number', id)
      }

      const { data, error } = await query.maybeSingle()
      if (error || !data) {
        return localSubscriptions.find((s) => s.id === id || s.subscriptionNumber === id) ?? null
      }
      return normalizeDbSubscription(data)
    } catch {
      return localSubscriptions.find((s) => s.id === id || s.subscriptionNumber === id) ?? null
    }
  },

  async listCustomers() {
    if (!isSupabaseConfigured || !supabase) {
      return developmentCustomers
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .order('name')

      if (error || !data || data.length === 0) {
        return developmentCustomers
      }
      return data
    } catch {
      return developmentCustomers
    }
  },

  async listPlans() {
    if (!isSupabaseConfigured || !supabase) {
      return developmentPlans
    }

    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*, plan_items(*, product:products(name, sales_price))')
        .eq('is_active', true)

      if (error || !data || data.length === 0) {
        return developmentPlans
      }

      return data.map((p) => {
        const item = p.plan_items?.[0]
        const unitPrice = Number(item?.unit_price ?? item?.product?.sales_price ?? 0)
        return {
          id: p.id,
          name: p.name,
          unitPrice,
          currency: 'INR',
          billingFrequency: p.billing_interval || 'monthly',
          billingInterval: p.interval_count || 1,
        }
      })
    } catch {
      return developmentPlans
    }
  },

  async create(input) {
    if (!isSupabaseConfigured || !supabase) {
      const newSub = {
        ...input,
        id: `demo_sub_${Date.now()}`,
        subscriptionNumber: `SUB-${Date.now().toString().slice(-4)}`,
        currentPeriodStart: input.startDate,
        currentPeriodEnd: input.nextBillingDate,
        status: input.status ?? 'Draft',
      }
      localSubscriptions = [newSub, ...localSubscriptions]
      return newSub
    }

    try {
      const subNumber = `SUB-${Date.now().toString().slice(-6)}`
      const record = {
        subscription_number: subNumber,
        customer_id: input.customerId,
        plan_id: input.planId,
        status: (input.status || 'draft').toLowerCase(),
        start_date: input.startDate,
        end_date: input.expiryDate || null,
        next_billing_date: input.nextBillingDate,
        billing_interval: input.billingFrequency,
        interval_count: input.billingInterval || 1,
        payment_terms_days: 15,
        currency: input.currency || 'INR',
        auto_close: false,
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .insert([record])
        .select(`
          *,
          customer:customers(id, name, email),
          plan:plans(id, name)
        `)
        .single()

      if (error) throw error

      // Insert subscription items
      const { data: planItems } = await supabase
        .from('plan_items')
        .select('product_id, unit_price')
        .eq('plan_id', input.planId)
        .limit(1)

      const productId = planItems?.[0]?.product_id

      if (productId) {
        await supabase.from('subscription_items').insert([{
          subscription_id: data.id,
          product_id: productId,
          description: `${data.plan?.name || 'Plan'} Subscription`,
          quantity: input.quantity || 1,
          unit_price: input.unitPrice || 0,
          tax_rate_percent: 18.00,
        }])
      }

      return normalizeDbSubscription(data)
    } catch (err) {
      const newSub = {
        ...input,
        id: `local_sub_${Date.now()}`,
        subscriptionNumber: `SUB-${Date.now().toString().slice(-4)}`,
        currentPeriodStart: input.startDate,
        currentPeriodEnd: input.nextBillingDate,
        status: input.status ?? 'Draft',
      }
      localSubscriptions = [newSub, ...localSubscriptions]
      return newSub
    }
  },

  async update(id, changes) {
    if (!isSupabaseConfigured || !supabase) {
      const idx = localSubscriptions.findIndex((s) => s.id === id)
      if (idx >= 0) {
        localSubscriptions[idx] = { ...localSubscriptions[idx], ...changes }
        return localSubscriptions[idx]
      }
      return null
    }

    try {
      const payload = { updated_at: new Date().toISOString() }
      if (changes.status) payload.status = changes.status.toLowerCase()
      if (changes.nextBillingDate) payload.next_billing_date = changes.nextBillingDate
      if (changes.pausedAt) payload.paused_at = new Date().toISOString()
      if (changes.closedAt) payload.closed_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', id)
        .select(`
          *,
          customer:customers(id, name, email),
          plan:plans(id, name),
          items:subscription_items(*)
        `)
        .single()

      if (error) throw error
      return normalizeDbSubscription(data)
    } catch {
      const idx = localSubscriptions.findIndex((s) => s.id === id)
      if (idx >= 0) {
        localSubscriptions[idx] = { ...localSubscriptions[idx], ...changes }
        return localSubscriptions[idx]
      }
      return null
    }
  },
}

function filterLocalSubscriptions(search, status) {
  const q = search.trim().toLowerCase()
  return localSubscriptions.filter((s) => {
    const matchesSearch = `${s.customerName} ${s.planName} ${s.id}`.toLowerCase().includes(q)
    const matchesStatus = status === 'all' || s.status.toLowerCase() === status.toLowerCase()
    return matchesSearch && matchesStatus
  })
}

export const supabaseInvoiceAdapter = {
  async list({ search = '', status = 'all' } = {}) {
    if (!isSupabaseConfigured || !supabase) {
      return filterLocalInvoices(search, status)
    }

    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email),
          items:invoice_items(*)
        `)
        .order('issue_date', { ascending: false })

      if (status !== 'all') {
        query = query.eq('status', status.toLowerCase())
      }

      const { data, error } = await query
      if (error || !data || data.length === 0) {
        return filterLocalInvoices(search, status)
      }

      let results = data.map(normalizeDbInvoice)
      if (search) {
        const q = search.trim().toLowerCase()
        results = results.filter((inv) => `${inv.invoiceNumber} ${inv.customerName}`.toLowerCase().includes(q))
      }
      return results
    } catch {
      return filterLocalInvoices(search, status)
    }
  },

  async getById(id) {
    if (!isSupabaseConfigured || !supabase) {
      return localInvoices.find((inv) => inv.id === id || inv.invoiceNumber === id) ?? null
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email),
          items:invoice_items(*)
        `)

      if (isUuid) {
        query = query.eq('id', id)
      } else {
        query = query.eq('invoice_number', id)
      }

      const { data, error } = await query.maybeSingle()
      if (error || !data) {
        return localInvoices.find((inv) => inv.id === id || inv.invoiceNumber === id) ?? null
      }
      return normalizeDbInvoice(data)
    } catch {
      return localInvoices.find((inv) => inv.id === id || inv.invoiceNumber === id) ?? null
    }
  },

  async createDraft(input) {
    if (!isSupabaseConfigured || !supabase) {
      const record = {
        ...input,
        id: `demo_inv_${Date.now()}`,
        invoiceNumber: `DEMO-${Date.now()}`,
        status: 'Draft',
        issuedAt: getLocalDateOnly(),
      }
      localInvoices = [record, ...localInvoices]
      return record
    }

    try {
      const invNumber = `INV-${Date.now().toString().slice(-6)}`
      const record = {
        invoice_number: invNumber,
        customer_id: input.customerId,
        subscription_id: input.subscriptionId || null,
        billing_period_start: input.period?.startDate || getLocalDateOnly(),
        billing_period_end: input.period?.endDateExclusive || null,
        issue_date: getLocalDateOnly(),
        due_date: input.dueAt || getLocalDateOnly(),
        status: 'draft',
        currency: input.currency || 'INR',
        subtotal: input.subtotal || 0,
        discount_amount: input.discountAmount || 0,
        tax_amount: input.taxAmount || 0,
        total_amount: input.total || 0,
        amount_paid: 0,
      }

      const { data: inv, error: invError } = await supabase
        .from('invoices')
        .insert([record])
        .select(`*, customer:customers(id, name, email)`)
        .single()

      if (invError) throw invError

      if (Array.isArray(input.items) && input.items.length > 0) {
        const lineRecords = input.items.map((item) => ({
          invoice_id: inv.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.amount || (item.quantity * item.unitPrice),
          discount_amount: 0,
          taxable_amount: item.amount || (item.quantity * item.unitPrice),
          tax_rate_percent: 18.00,
          tax_amount: (item.amount || (item.quantity * item.unitPrice)) * 0.18,
          total_amount: (item.amount || (item.quantity * item.unitPrice)) * 1.18,
        }))
        await supabase.from('invoice_items').insert(lineRecords)
      }

      return normalizeDbInvoice(inv)
    } catch {
      const record = {
        ...input,
        id: `demo_inv_${Date.now()}`,
        invoiceNumber: `DEMO-${Date.now()}`,
        status: 'Draft',
        issuedAt: getLocalDateOnly(),
      }
      localInvoices = [record, ...localInvoices]
      return record
    }
  },

  async requestGeneration({ requests, asOfDate }) {
    if (!isSupabaseConfigured || !supabase) {
      return { requested: requests?.length || 0, results: [] }
    }

    try {
      const { data, error } = await supabase.rpc('generate_recurring_invoices', {
        p_as_of_date: asOfDate || getLocalDateOnly(),
      })

      if (error) {
        console.warn('RPC generate_recurring_invoices failed or not applied yet, running client-side fallback:', error.message)
        return { requested: requests?.length || 0, results: [], error: error.message }
      }

      return { requested: requests?.length || 0, results: data?.invoices || [], summary: data }
    } catch (err) {
      return { requested: requests?.length || 0, results: [], error: err.message }
    }
  },
}

function filterLocalInvoices(search, status) {
  const q = search.trim().toLowerCase()
  return localInvoices.filter((inv) => {
    const matchesSearch = `${inv.invoiceNumber} ${inv.customerName}`.toLowerCase().includes(q)
    const matchesStatus = status === 'all' || inv.status.toLowerCase() === status.toLowerCase()
    return matchesSearch && matchesStatus
  })
}

/**
 * Configure both Member 3 adapters with Supabase database integration
 */
export function initAdapters() {
  try {
    configureSubscriptionAdapter(supabaseSubscriptionAdapter)
    configureInvoiceAdapter(supabaseInvoiceAdapter)
  } catch (err) {
    console.error('Failed to configure adapters:', err)
  }
}

