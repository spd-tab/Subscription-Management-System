import { supabase, isSupabaseConfigured } from './client'
import { payments as mockPayments, customers as mockCustomers, subscriptions as mockSubscriptions, invoices as mockInvoices } from '../../data/mockData'

// ─── PAYMENT QUERIES ────────────────────────────────────────

/**
 * Standardize payment method string to match the PostgreSQL constraint:
 * ('cash', 'bank_transfer', 'card', 'UPI', 'cheque', 'other')
 */
export function normalizePaymentMethod(method) {
  if (!method) return 'card'
  const m = String(method).trim().toLowerCase()
  if (m === 'upi') return 'UPI'
  if (m === 'card' || m === 'credit_card' || m === 'debit_card') return 'card'
  if (m === 'bank_transfer' || m === 'wire' || m === 'ach' || m === 'net_banking') return 'bank_transfer'
  if (m === 'cash') return 'cash'
  if (m === 'cheque' || m === 'check') return 'cheque'
  return 'other'
}

/**
 * Fetch all payments. Admins/staff see all; customers see their own (enforced by RLS).
 */
export async function fetchPayments({ search = '', status = 'all', page = 1, perPage = 10 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    let filtered = [...mockPayments]
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((p) => `${p.id} ${p.customer} ${p.method}`.toLowerCase().includes(q))
    }
    if (status !== 'all') {
      filtered = filtered.filter((p) => (p.status || '').toLowerCase() === status.toLowerCase())
    }
    return { data: filtered, count: filtered.length, error: null }
  }

  try {
    let query = supabase.from('payments').select('*, invoice:invoices(invoice_number, customer:customers(name))', { count: 'exact' })

    if (search) {
      query = query.or(`payment_number.ilike.%${search}%,reference.ilike.%${search}%`)
    }
    if (status !== 'all') {
      query = query.eq('status', status.toLowerCase())
    }

    query = query.order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    const { data, count, error } = await query

    if (error) {
      return { data: [], count: 0, error }
    }

    const normalized = (data || []).map((p) => ({
      ...p,
      id: p.payment_number || p.id,
      customer: p.invoice?.customer?.name || (p.note?.startsWith('Customer: ') ? p.note.replace(/^Customer:\s*/, '').split('|')[0].trim() : 'Customer'),
      customer_name: p.invoice?.customer?.name || (p.note?.startsWith('Customer: ') ? p.note.replace(/^Customer:\s*/, '').split('|')[0].trim() : 'Customer'),
      method: p.payment_method,
      paid_at: p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-',
      date: p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-',
      status: p.status || 'paid',
    }))

    return { data: normalized, count, error: null }
  } catch (err) {
    return { data: [], count: 0, error: err }
  }
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
 * Record a new payment (conforming to Brightloop Contract and recalculation trigger)
 */
export async function createPayment(payment) {
  if (!isSupabaseConfigured || !supabase) {
    const newPayment = {
      id: `PAY-${Date.now()}`,
      ...payment,
      payment_method: normalizePaymentMethod(payment.payment_method || payment.method),
      created_at: new Date().toISOString(),
    }
    return { data: newPayment, error: null }
  }

  let resolvedInvoiceId = null
  if (payment.invoice_id) {
    const cleanId = String(payment.invoice_id).trim()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)
    if (isUuid) {
      resolvedInvoiceId = cleanId
    } else {
      const { data: inv } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_number', cleanId)
        .maybeSingle()
      if (inv?.id) {
        resolvedInvoiceId = inv.id
      } else {
        return { data: null, error: { message: `Invoice "${cleanId}" was not found.` } }
      }
    }
  }

  const record = {
    payment_number: payment.payment_number || `PAY-${Date.now().toString().slice(-4)}`,
    invoice_id: resolvedInvoiceId,
    amount: parseFloat(payment.amount),
    payment_method: normalizePaymentMethod(payment.payment_method || payment.method),
    payment_date: payment.payment_date || payment.paid_at || new Date().toISOString(),
    reference: payment.reference || null,
    note: payment.customer_name
      ? `Customer: ${payment.customer_name}${payment.note || payment.notes ? ' | ' + (payment.note || payment.notes) : ''}`
      : payment.note || payment.notes || null,
    status: (payment.status || 'paid').toLowerCase(),
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

  const payload = { ...updates }
  if (payload.payment_method || payload.method) {
    payload.payment_method = normalizePaymentMethod(payload.payment_method || payload.method)
  }
  if (payload.status) {
    payload.status = payload.status.toLowerCase()
  }

  const { data, error } = await supabase
    .from('payments')
    .update(payload)
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

export async function deleteDiscount(id) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null }
  }

  const { error } = await supabase.from('discounts').delete().eq('id', id)
  return { error }
}

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

// ─── CUSTOMER MANAGEMENT QUERIES ────────────────────────────

export async function fetchCustomers() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: mockCustomers, error: null }
  }

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      subscriptions:subscriptions(count),
      invoices:invoices(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error }
  }

  return { data, error: null }
}

export async function fetchCustomerById(customerId) {
  if (!isSupabaseConfigured || !supabase) {
    const found = mockCustomers.find((c) => c.id === customerId) || mockCustomers[0]
    return { data: found, error: null }
  }

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      subscriptions:subscriptions(*, plan:plans(name)),
      invoices:invoices(*)
    `)
    .eq('id', customerId)
    .maybeSingle()

  return { data, error }
}

export async function createCustomer(customer) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: {
        id: `cus_${Date.now()}`,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '+91 98765 43210',
        billing_address: customer.billing_address || customer.region || 'India',
        created_at: new Date().toISOString(),
      },
      error: null,
    }
  }

  const record = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone || null,
    billing_address: customer.billing_address || customer.region || null,
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([record])
    .select()
    .single()

  return { data, error }
}

export async function updateCustomer(customerId, updates) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { id: customerId, ...updates }, error: null }
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', customerId)
    .select()
    .single()

  return { data, error }
}

export async function fetchCustomerSubscriptions(customerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: mockSubscriptions, error: null }
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function fetchCustomerInvoices(customerId) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: mockInvoices, error: null }
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*, items:invoice_items(*), payments:payments(*)')
    .eq('customer_id', customerId)
    .order('issue_date', { ascending: false })

  return { data, error }
}

// ─── CUSTOMER PORTAL QUERIES ────────────────────────────────

export async function fetchPortalCustomer(authUserId, userEmail) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: {
        id: 'cust_demo_portal',
        name: 'Alex Morgan',
        email: userEmail || 'alex@company.com',
        phone: '+91 98765 43210',
        billing_address: 'Bangalore, India',
      },
      error: null,
    }
  }

  if (authUserId) {
    const { data: byAuth, error: authErr } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (byAuth) return { data: byAuth, error: null }
  }

  if (userEmail) {
    const { data: byEmail, error: emailErr } = await supabase
      .from('customers')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (byEmail) return { data: byEmail, error: null }
  }

  return { data: null, error: { message: 'Customer profile not found' } }
}

export async function fetchPortalDashboardStats(customerId) {
  if (!isSupabaseConfigured || !supabase || !customerId) {
    return {
      activeSubsCount: 2,
      nextInvoiceDue: '₹4,500',
      nextInvoiceDate: 'Next cycle',
      totalPaidYtd: '₹35,400',
      recentActivity: [
        { icon: 'CreditCard', text: 'Payment of ₹25,000 received', detail: 'Cloud ERP Suite', time: 'Recently', status: 'paid' },
        { icon: 'FileText', text: 'Invoice #INV-2025-001 confirmed', detail: 'Annual Subscription', time: 'Recently', status: 'confirmed' },
      ],
    }
  }

  try {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('customer_id', customerId)
      .eq('status', 'active')

    const { data: invs } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, amount_paid, due_date, status')
      .eq('customer_id', customerId)
      .order('due_date', { ascending: true })

    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_date, payment_method, status, invoice:invoices!inner(customer_id)')
      .eq('invoice.customer_id', customerId)
      .order('payment_date', { ascending: false })

    const activeCount = subs?.length || 0
    const pendingInv = (invs || []).find((i) => i.status === 'confirmed' || i.status === 'draft')
    const paidPayments = (payments || []).filter((p) => p.status === 'paid' || p.status === 'confirmed')
    const totalPaid = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const activity = []
    if (payments && payments[0]) {
      activity.push({
        icon: 'CreditCard',
        text: `Payment of ₹${Number(payments[0].amount).toLocaleString()} recorded`,
        detail: payments[0].payment_method || 'Online Payment',
        time: payments[0].payment_date ? new Date(payments[0].payment_date).toLocaleDateString() : 'Recently',
        status: payments[0].status,
      })
    }
    if (invs && invs[0]) {
      activity.push({
        icon: 'FileText',
        text: `Invoice #${invs[0].invoice_number} generated`,
        detail: `₹${Number(invs[0].total_amount).toLocaleString()} due`,
        time: invs[0].due_date || 'Upcoming',
        status: invs[0].status,
      })
    }

    return {
      activeSubsCount: activeCount,
      nextInvoiceDue: pendingInv ? `₹${(Number(pendingInv.total_amount) - Number(pendingInv.amount_paid)).toLocaleString()}` : '₹0',
      nextInvoiceDate: pendingInv?.due_date ? `Due ${pendingInv.due_date}` : 'All settled',
      totalPaidYtd: `₹${totalPaid.toLocaleString()}`,
      recentActivity: activity.length ? activity : [
        { icon: 'FileText', text: 'Account created', detail: 'Welcome to Brightloop', time: 'Recently', status: 'active' },
      ],
    }
  } catch {
    return {
      activeSubsCount: 1,
      nextInvoiceDue: '₹0',
      nextInvoiceDate: 'All settled',
      totalPaidYtd: '₹0',
      recentActivity: [],
    }
  }
}

export async function payInvoice({ invoiceId, amount, paymentMethod, reference, note }) {
  return createPayment({
    invoice_id: invoiceId,
    amount: parseFloat(amount),
    payment_method: paymentMethod || 'card',
    reference: reference || `REF-${Date.now().toString().slice(-6)}`,
    note: note || 'Paid via Customer Portal',
    status: 'paid',
  })
}
