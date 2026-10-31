import { supabase } from '../../../services/supabase/client.js'
import { getLocalDateOnly, calculateDiscountAmount, calculateInvoiceItemTotals, calculateInvoiceLinesSubtotal } from './calculationUtils.js'
import { validateInvoiceDraft } from './invoiceValidation.js'

const INVOICE_SELECT = '*,customer:customers(id,name,email),subscription:subscriptions(id,subscription_number),items:invoice_items(id,product_id,variant_id,description,quantity,unit_price,subtotal,discount_amount,taxable_amount,tax_rate_percent,tax_amount,total_amount,product:products(name),variant:product_variants(name))'
const PAGE_SIZE = 500
const STATUS_FROM_DATABASE = Object.freeze({
  draft: 'Draft',
  confirmed: 'Confirmed',
  paid: 'Paid',
  cancelled: 'Cancelled',
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

function normalizeInvoiceItem(item) {
  return {
    id: item.id,
    productId: item.product_id,
    variantId: item.variant_id,
    description: item.description || [item.product?.name, item.variant?.name].filter(Boolean).join(' · ') || 'Invoice item',
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    subtotal: Number(item.subtotal),
    discountAmount: Number(item.discount_amount),
    taxableAmount: Number(item.taxable_amount),
    taxRatePercent: Number(item.tax_rate_percent),
    taxAmount: Number(item.tax_amount),
    totalAmount: Number(item.total_amount),
  }
}

function normalizeInvoice(record) {
  const status = STATUS_FROM_DATABASE[record.status] ?? record.status
  const amountPaid = Number(record.amount_paid)
  const total = Number(record.total_amount)
  const overdue = status === 'Confirmed' && record.due_date < getLocalDateOnly() && amountPaid < total
  return {
    id: record.id,
    invoiceNumber: record.invoice_number,
    customerId: record.customer_id,
    customerName: record.customer?.name ?? 'Customer',
    customerEmail: record.customer?.email ?? '',
    subscriptionId: record.subscription_id,
    subscriptionNumber: record.subscription?.subscription_number ?? null,
    billingPeriodStart: record.billing_period_start,
    billingPeriodEnd: record.billing_period_end,
    issuedAt: record.issue_date,
    dueAt: record.due_date,
    status: overdue ? 'Overdue' : status,
    databaseStatus: status,
    currency: record.currency?.trim() || 'INR',
    items: (record.items ?? []).map(normalizeInvoiceItem),
    subtotal: Number(record.subtotal),
    discountAmount: Number(record.discount_amount),
    taxableAmount: Number(record.subtotal) - Number(record.discount_amount),
    taxAmount: Number(record.tax_amount),
    total,
    amountPaid,
    outstandingBalance: Math.max(0, total - amountPaid),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function createInvoiceNumber() {
  if (!globalThis.crypto?.randomUUID) throw new Error('A secure browser UUID generator is required to create a unique invoice number.')
  return `INV-${getLocalDateOnly().replaceAll('-', '')}-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

async function removeInvoiceAfterFailure(client, id, originalError) {
  const rollback = await client.from('invoices').delete().eq('id', id)
  if (rollback.error) {
    throw new AggregateError(
      [originalError, rollback.error],
      `Invoice creation failed and its incomplete database record could not be removed: ${rollback.error.message}`,
    )
  }
  throw originalError
}

export function createSupabaseInvoiceAdapter(client = supabase) {
  if (!client) throw new Error('Supabase is not configured.')

  return {
    async list({ search = '', status = 'all' } = {}) {
      const records = await fetchAll(
        () => client.from('invoices').select(INVOICE_SELECT).order('issue_date', { ascending: false }),
        'Unable to load invoices',
      )
      const normalizedSearch = search.trim().toLowerCase()
      return records.map(normalizeInvoice).filter((record) => {
        const matchesSearch = `${record.invoiceNumber} ${record.customerName} ${record.customerEmail}`.toLowerCase().includes(normalizedSearch)
        const matchesStatus = status === 'all' || record.status.toLowerCase() === status.toLowerCase()
        return matchesSearch && matchesStatus
      })
    },

    async getById(id) {
      let query = client.from('invoices').select(INVOICE_SELECT)
      query = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        ? query.eq('id', id)
        : query.eq('invoice_number', id)
      const result = await query.maybeSingle()
      const record = assertQuery(result, 'Unable to load invoice details')
      return record ? normalizeInvoice(record) : null
    },

    async listTaxRates() {
      return fetchAll(
        () => client.from('tax_rates').select('id,name,rate_percent').eq('is_active', true).order('name', { ascending: true }),
        'Unable to load configured tax rates',
      ).then((records) => records.map((record) => ({
        id: record.id,
        name: record.name,
        ratePercent: Number(record.rate_percent),
      })))
    },

    async createDraft(input) {
      const customerResult = await client.from('customers').select('id').eq('id', input.customerId).single()
      assertQuery(customerResult, 'Unable to verify the selected customer')
      const issueDate = getLocalDateOnly()
      const dueDate = input.dueAt || issueDate
      let taxRatePercent = 0
      if (input.taxRateId) {
        const taxResult = await client.from('tax_rates').select('id,rate_percent').eq('id', input.taxRateId).eq('is_active', true).single()
        taxRatePercent = Number(assertQuery(taxResult, 'Unable to verify the selected tax rate').rate_percent)
      }

      const subtotal = calculateInvoiceLinesSubtotal(input.items ?? [])
      const validationError = validateInvoiceDraft({
        ...input,
        dueAt: dueDate,
        subtotal,
        taxRatePercent,
      })
      if (validationError) throw new Error(validationError)
      const discountAmount = calculateDiscountAmount(subtotal, {
        type: input.discountType ?? 'fixed',
        value: input.discountValue ?? 0,
      })
      const totals = calculateInvoiceItemTotals(
        input.items.map((item) => ({
          ...item,
          productId: item.productId ?? null,
          variantId: item.variantId ?? null,
          taxRatePercent,
        })),
        discountAmount,
      )
      const invoiceRecord = {
        invoice_number: createInvoiceNumber(),
        customer_id: input.customerId,
        subscription_id: input.subscriptionId ?? null,
        billing_period_start: input.periodStart ?? null,
        billing_period_end: input.periodEndExclusive ?? null,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'draft',
        currency: 'INR',
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
      }
      const invoiceResult = await client.from('invoices').insert(invoiceRecord).select('id').single()
      const createdInvoice = assertQuery(invoiceResult, 'Unable to create invoice draft')
      const itemRecords = totals.items.map((item) => ({
        invoice_id: createdInvoice.id,
        product_id: item.productId,
        variant_id: item.variantId,
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
        discount_amount: item.discountAmount,
        taxable_amount: item.taxableAmount,
        tax_rate_percent: item.taxRatePercent,
        tax_amount: item.taxAmount,
        total_amount: item.totalAmount,
      }))
      const itemsResult = await client.from('invoice_items').insert(itemRecords)
      if (itemsResult.error) return removeInvoiceAfterFailure(client, createdInvoice.id, new Error(`Unable to save invoice items: ${itemsResult.error.message}`, { cause: itemsResult.error }))
      return this.getById(createdInvoice.id)
    },

    async requestGeneration() {
      throw new Error('Recurring invoice generation is unavailable: the schema has no trusted generation RPC. See RECURRING_INVOICE_RPC_SPEC.md; do not generate recurring invoices directly from the browser.')
    },
  }
}
