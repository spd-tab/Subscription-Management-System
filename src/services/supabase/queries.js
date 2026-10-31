import { supabase, isSupabaseConfigured } from './client'
import { payments as mockPayments } from '../../data/mockData'

// ─── PAYMENT QUERIES ────────────────────────────────────────

/**
 * Fetch all payments. Admins/staff see all; customers see their own (enforced by RLS).
 */
export async function fetchPayments({ search = '', status = 'all', page = 1, perPage = 10 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    // Demo mode: filter mock data
    let filtered = [...mockPayments]
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((p) => `${p.id} ${p.customer} ${p.method}`.toLowerCase().includes(q))
    }
    if (status !== 'all') {
      filtered = filtered.filter((p) => p.status.toLowerCase() === status.toLowerCase())
    }
    return { data: filtered, count: filtered.length, error: null }
  }

  let query = supabase.from('payments').select('*, invoice:invoices(invoice_number, customer:customers(name))', { count: 'exact' })

  if (search) {
    query = query.or(`payment_number.ilike.%${search}%,reference.ilike.%${search}%`)
  }
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  query = query.order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  const { data, count, error } = await query

  const normalized = (data || []).map((p) => ({
    ...p,
    id: p.payment_number || p.id,
    customer: p.invoice?.customer?.name || 'Customer',
    customer_name: p.invoice?.customer?.name || 'Customer',
    method: p.payment_method,
    paid_at: p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-',
    date: p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-',
  }))

  return { data: normalized, count, error }
}

/**
 * Fetch a single payment by ID
 */
export async function fetchPaymentById(id) {
  if (!isSupabaseConfigured || !supabase) {
    const found = mockPayments.find((p) => p.id === id)
    return { data: found || null, error: found ? null : { message: 'Payment not found' } }
  }

  const { data, error } = await supabase.from('payments').select('*, invoice:invoices(*, customer:customers(*))').eq('id', id).single()
  return { data, error }
}

/**
 * Fetch payments for a specific invoice
 */
export async function fetchPaymentsByInvoice(invoiceId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: mockPayments.filter((p) => p.invoiceId === invoiceId), error: null }
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Fetch payments for a specific customer
 */
export async function fetchPaymentsByCustomer(customerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: mockPayments, error: null }
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices!inner(customer_id)')
    .eq('invoice.customer_id', customerId)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Record a new payment (conforming to Brightloop Contract)
 */
export async function createPayment(payment) {
  if (!isSupabaseConfigured || !supabase) {
    const newPayment = {
      id: `PAY-${Date.now()}`,
      ...payment,
      created_at: new Date().toISOString(),
    }
    return { data: newPayment, error: null }
  }

  // Map to contract column names
  const record = {
    payment_number: payment.payment_number || `PAY-${Date.now().toString().slice(-4)}`,
    invoice_id: payment.invoice_id,
    amount: payment.amount,
    payment_method: payment.payment_method || payment.method || 'card',
    payment_date: payment.payment_date || payment.paid_at || new Date().toISOString(),
    reference: payment.reference || null,
    note: payment.note || payment.notes || null,
    status: payment.status || 'paid',
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([record])
    .select()
    .single()

  return { data, error }
}

/**
 * Update an existing payment
 */
export async function updatePayment(id, updates) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { id, ...updates }, error: null }
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

// ─── DISCOUNT QUERIES ───────────────────────────────────────

const mockDiscounts = [
  { id: '1', name: 'Welcome Launch Offer', code: 'WELCOME20', description: 'Welcome discount for new customers', type: 'percentage', value: 20, min_order_amount: 2000, max_uses: 100, current_uses: 14, start_date: '2025-01-01', end_date: '2025-12-31', status: 'active', created_at: '2025-01-01' },
  { id: '2', name: 'Enterprise Flat INR 5000', code: 'CORP5000', description: 'Flat INR 5000 off enterprise plans', type: 'fixed', value: 5000, min_order_amount: 25000, max_uses: 50, current_uses: 8, start_date: '2025-01-01', end_date: '2025-06-30', status: 'active', created_at: '2025-01-15' },
  { id: '3', name: 'Annual Loyalty Pass', code: 'ANNUAL15', description: '15% off annual subscriptions', type: 'percentage', value: 15, min_order_amount: 10000, max_uses: null, current_uses: 42, start_date: '2025-01-01', end_date: null, status: 'active', created_at: '2025-02-20' },
  { id: '4', name: 'Partner Referral Pass', code: 'PARTNER25', description: 'Partner referral discount', type: 'percentage', value: 25, min_order_amount: 0, max_uses: 100, current_uses: 67, start_date: '2024-06-01', end_date: '2025-06-01', status: 'active', created_at: '2024-06-01' },
]

/**
 * Fetch all discounts (maps DB contract columns to UI properties)
 */
export async function fetchDiscounts({ search = '', status = 'all' } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    let filtered = [...mockDiscounts]
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((d) => `${d.code} ${d.name} ${d.description || ''}`.toLowerCase().includes(q))
    }
    if (status !== 'all') {
      filtered = filtered.filter((d) => d.status === status)
    }
    return { data: filtered, error: null }
  }

  let query = supabase.from('discounts').select('*')
  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  const normalized = (data || []).map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.name,
    type: d.discount_type,
    value: parseFloat(d.value),
    min_order_amount: parseFloat(d.minimum_purchase || 0),
    max_uses: d.usage_limit,
    current_uses: d.usage_count || 0,
    start_date: d.starts_at ? d.starts_at.split('T')[0] : null,
    end_date: d.ends_at ? d.ends_at.split('T')[0] : null,
    status: d.is_active ? 'active' : 'inactive',
    created_at: d.created_at,
  }))

  return { data: normalized, error }
}

/**
 * Create a new discount (maps UI properties to contract columns)
 */
export async function createDiscount(discount) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { id: `disc-${Date.now()}`, ...discount, current_uses: 0, created_at: new Date().toISOString() }, error: null }
  }

  const record = {
    name: discount.name || discount.description || discount.code,
    code: discount.code.toUpperCase().replace(/\s+/g, ''),
    discount_type: discount.type || 'percentage',
    value: discount.value,
    minimum_purchase: discount.min_order_amount || 0,
    minimum_quantity: 1,
    starts_at: discount.start_date ? new Date(discount.start_date).toISOString() : new Date().toISOString(),
    ends_at: discount.end_date ? new Date(discount.end_date).toISOString() : null,
    usage_limit: discount.max_uses || null,
    applies_to: 'both',
    is_active: discount.status === 'active',
  }

  const { data, error } = await supabase
    .from('discounts')
    .insert([record])
    .select()
    .single()

  return { data, error }
}

/**
 * Update a discount
 */
export async function updateDiscount(id, updates) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { id, ...updates }, error: null }
  }

  const record = {}
  if (updates.name || updates.description) record.name = updates.name || updates.description
  if (updates.code) record.code = updates.code.toUpperCase().replace(/\s+/g, '')
  if (updates.type) record.discount_type = updates.type
  if (updates.value !== undefined) record.value = updates.value
  if (updates.min_order_amount !== undefined) record.minimum_purchase = updates.min_order_amount
  if (updates.max_uses !== undefined) record.usage_limit = updates.max_uses
  if (updates.start_date !== undefined) record.starts_at = updates.start_date ? new Date(updates.start_date).toISOString() : null
  if (updates.end_date !== undefined) record.ends_at = updates.end_date ? new Date(updates.end_date).toISOString() : null
  if (updates.status !== undefined) record.is_active = updates.status === 'active'
  record.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('discounts')
    .update(record)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Delete a discount
 */
export async function deleteDiscount(id) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null }
  }

  const { error } = await supabase.from('discounts').delete().eq('id', id)
  return { error }
}

/**
 * Validate a discount code against database contract
 */
export async function validateDiscountCode(code) {
  if (!isSupabaseConfigured || !supabase) {
    const discount = mockDiscounts.find((d) => d.code === code && d.status === 'active')
    if (!discount) return { valid: false, error: 'Invalid or expired discount code' }
    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return { valid: false, error: 'Discount has reached maximum uses' }
    }
    return { valid: true, discount, error: null }
  }

  const { data, error } = await supabase
    .from('discounts')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error || !data) return { valid: false, error: 'Invalid or expired discount code' }
  if (data.usage_limit && data.usage_count >= data.usage_limit) {
    return { valid: false, error: 'Discount has reached maximum uses' }
  }
  if (data.ends_at && new Date(data.ends_at) < new Date()) {
    return { valid: false, error: 'Discount has expired' }
  }

  return {
    valid: true,
    discount: {
      ...data,
      type: data.discount_type,
      min_order_amount: data.minimum_purchase,
      max_uses: data.usage_limit,
      current_uses: data.usage_count,
    },
    error: null,
  }
}
