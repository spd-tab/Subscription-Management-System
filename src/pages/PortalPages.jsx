import { useState, useEffect, useCallback } from 'react'
import { CreditCard, FileText, RefreshCw, Settings, Tag, User, TrendingUp, Calendar, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, MetricCard, SearchBar, StatusBadge, Modal, LoadingState, ErrorState, EmptyState } from '../components/common/UI'
import {
  fetchPortalCustomer,
  fetchPortalDashboardStats,
  fetchCustomerSubscriptions,
  fetchCustomerInvoices,
  fetchPaymentsByCustomer,
  payInvoice,
  updateCustomer,
} from '../services/supabase/queries'

// ─── Portal Dashboard ─────────────────────────────────────

export function PortalDashboardPage() {
  const { user, profile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [stats, setStats] = useState({
    activeSubsCount: 0,
    nextInvoiceDue: '₹0',
    nextInvoiceDate: 'All settled',
    totalPaidYtd: '₹0',
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  const name = profile?.full_name || user?.email?.split('@')[0] || 'Customer'

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cust } = await fetchPortalCustomer(user?.id, user?.email)
      if (cust) {
        setCustomer(cust)
        const dashboardStats = await fetchPortalDashboardStats(cust.id)
        setStats(dashboardStats)
      }
    } catch (err) {
      console.warn('Dashboard load fallback:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <>
      <div className="portal-welcome">
        <div className="portal-welcome-content">
          <h1>Welcome back, {name.split(' ')[0]}</h1>
          <p>Here's an overview of your Brightloop services, billing cycles, and payment history.</p>
        </div>
        <div className="portal-welcome-badge">
          <span className="avatar portal-avatar">{name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
        </div>
      </div>

      <div className="portal-metrics">
        <MetricCard label="Active Subscriptions" value={loading ? '…' : stats.activeSubsCount.toString()} delta="Live contracts" />
        <MetricCard label="Next Invoice Balance" value={loading ? '…' : stats.nextInvoiceDue} delta={stats.nextInvoiceDate} />
        <MetricCard label="Total Paid (All Time)" value={loading ? '…' : stats.totalPaidYtd} delta="Verified ledger" />
      </div>

      <div className="portal-quick-links">
        <Link to="/portal/subscriptions" className="portal-quick-card">
          <RefreshCw size={22} />
          <div>
            <strong>My Subscriptions</strong>
            <small>Manage plans & renewal dates</small>
          </div>
        </Link>
        <Link to="/portal/invoices" className="portal-quick-card">
          <FileText size={22} />
          <div>
            <strong>My Invoices</strong>
            <small>Review statements & pay balance</small>
          </div>
        </Link>
        <Link to="/portal/payments" className="portal-quick-card">
          <CreditCard size={22} />
          <div>
            <strong>Payment History</strong>
            <small>Receipts & transaction status</small>
          </div>
        </Link>
      </div>

      <section className="panel portal-activity">
        <h2>Recent Activity</h2>
        {loading ? (
          <LoadingState label="Loading recent activity…" />
        ) : stats.recentActivity.length === 0 ? (
          <EmptyState title="No recent activity" description="Transactions and invoices will appear here." />
        ) : (
          <div className="portal-activity-list">
            {stats.recentActivity.map((item, idx) => (
              <div className="portal-activity-row" key={idx}>
                <span className="portal-activity-icon">
                  {item.icon === 'CreditCard' ? <CreditCard size={17} /> : <FileText size={17} />}
                </span>
                <div className="portal-activity-info">
                  <strong>{item.text}</strong>
                  <small>{item.detail}</small>
                </div>
                <div className="portal-activity-right">
                  <StatusBadge>{item.status}</StatusBadge>
                  <small>{item.time}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

// ─── Portal Subscriptions ──────────────────────────────────

export function PortalSubscriptionsPage() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSubscriptions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: cust } = await fetchPortalCustomer(user?.id, user?.email)
      if (cust) {
        const { data, error: subErr } = await fetchCustomerSubscriptions(cust.id)
        if (subErr) throw subErr
        setSubscriptions(data || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load subscriptions.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>My Subscriptions</h1>
          <p>Review and monitor your active plans and renewal schedules</p>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading your subscriptions…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : subscriptions.length === 0 ? (
        <EmptyState title="No active subscriptions" description="You do not have any subscription contracts on file." />
      ) : (
        <div className="portal-sub-grid">
          {subscriptions.map((sub) => (
            <article className="portal-sub-card" key={sub.id}>
              <div className="portal-sub-header">
                <div>
                  <h3>{sub.plan?.name || sub.subscription_number}</h3>
                  <small>Billed {sub.billing_interval}</small>
                </div>
                <StatusBadge>{sub.status}</StatusBadge>
              </div>

              <div className="portal-sub-price">
                <strong>{sub.currency || 'INR'} {sub.subscription_number}</strong>
                <span>/ {sub.billing_interval}</span>
              </div>

              <div className="portal-sub-details">
                <div className="portal-sub-detail">
                  <Calendar size={15} />
                  <span>Started: {sub.start_date}</span>
                </div>
                <div className="portal-sub-detail">
                  <RefreshCw size={15} />
                  <span>Next billing: {sub.next_billing_date || 'N/A'}</span>
                </div>
              </div>

              <div className="portal-sub-actions">
                <Button variant="secondary">Active Plan</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Portal Invoices ───────────────────────────────────────

export function PortalInvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingInvoice, setPayingInvoice] = useState(null)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState('')

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: cust } = await fetchPortalCustomer(user?.id, user?.email)
      if (cust) {
        const { data, error: invErr } = await fetchCustomerInvoices(cust.id)
        if (invErr) throw invErr
        setInvoices(data || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load invoices.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const handlePay = async (e) => {
    e.preventDefault()
    setSubmittingPayment(true)
    const form = e.target
    const amount = parseFloat(form.amount.value)
    const paymentMethod = form.payment_method.value
    const reference = form.reference.value || `UPI-${Date.now().toString().slice(-6)}`

    try {
      const { error: payErr } = await payInvoice({
        invoiceId: payingInvoice.id,
        amount,
        paymentMethod,
        reference,
        note: `Customer portal payment for invoice #${payingInvoice.invoice_number}`,
      })

      if (payErr) throw payErr

      setPaymentSuccess(`Payment of ₹${amount.toLocaleString()} recorded successfully!`)
      setPayingInvoice(null)
      loadInvoices()
      setTimeout(() => setPaymentSuccess(''), 5000)
    } catch (err) {
      alert(err.message || 'Failed to record payment.')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const filtered = invoices.filter((inv) =>
    `${inv.invoice_number || inv.id}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>My Invoices</h1>
          <p>Review billing statements, outstanding balances, and settlement receipts</p>
        </div>
      </div>

      {paymentSuccess && (
        <div className="state-message" style={{ background: '#eaf5ea', color: '#1b631b', borderColor: '#b8e3b8', marginBottom: '14px' }}>
          <CheckCircle2 size={18} /> {paymentSuccess}
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice number…" />

      {loading ? (
        <LoadingState label="Loading your invoices…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="portal-invoice-list">
          {filtered.map((inv) => {
            const outstanding = Math.max(0, (Number(inv.total_amount) || 0) - (Number(inv.amount_paid) || 0))
            const canPay = inv.status !== 'paid' && outstanding > 0

            return (
              <article className="portal-invoice-card" key={inv.id}>
                <div className="portal-invoice-main">
                  <div className="portal-invoice-id">
                    <FileText size={18} />
                    <div>
                      <strong>#{inv.invoice_number}</strong>
                      <small>Issued {inv.issue_date} · Due {inv.due_date}</small>
                    </div>
                  </div>
                  <div className="portal-invoice-amount">
                    <strong className={inv.status === 'overdue' ? 'danger-text' : ''}>
                      ₹{(Number(inv.total_amount) || 0).toLocaleString()}
                    </strong>
                    <StatusBadge>{inv.status}</StatusBadge>
                  </div>
                </div>

                <div className="portal-invoice-footer">
                  <span>
                    {inv.amount_paid > 0 ? `Paid: ₹${Number(inv.amount_paid).toLocaleString()} (Bal: ₹${outstanding.toLocaleString()})` : 'Unpaid'}
                  </span>
                  {inv.status === 'paid' && (
                    <Button variant="secondary" onClick={() => window.print()}>
                      Receipt
                    </Button>
                  )}
                  {canPay && (
                    <Button onClick={() => setPayingInvoice(inv)}>
                      Pay Now (₹{outstanding.toLocaleString()})
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
          {filtered.length === 0 && <div className="empty-state">No invoices match your search.</div>}
        </div>
      )}

      {/* Payment Modal */}
      {payingInvoice && (
        <Modal title={`Pay Invoice #${payingInvoice.invoice_number}`} onClose={() => setPayingInvoice(null)}>
          <form className="modal-form" onSubmit={handlePay}>
            <div className="feature-summary" style={{ marginBottom: 12 }}>
              <span>Total Invoice Amount <strong>₹{Number(payingInvoice.total_amount).toLocaleString()}</strong></span>
              <span>Already Paid <strong>₹{Number(payingInvoice.amount_paid || 0).toLocaleString()}</strong></span>
              <span>Outstanding Balance <strong>₹{(Number(payingInvoice.total_amount) - Number(payingInvoice.amount_paid || 0)).toLocaleString()}</strong></span>
            </div>

            <label>
              Amount to pay (₹)
              <input
                name="amount"
                type="number"
                step="0.01"
                min="1"
                max={Number(payingInvoice.total_amount) - Number(payingInvoice.amount_paid || 0)}
                required
                defaultValue={Number(payingInvoice.total_amount) - Number(payingInvoice.amount_paid || 0)}
              />
            </label>

            <label>
              Payment method
              <select name="payment_method" required defaultValue="UPI">
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Net Banking / NEFT / IMPS</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              Transaction Reference / UTR
              <input name="reference" placeholder="e.g. UPI-9872635410" required />
            </label>

            <div className="feature-form-actions">
              <Button type="button" variant="secondary" onClick={() => setPayingInvoice(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPayment}>
                {submittingPayment ? 'Processing…' : 'Confirm Payment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ─── Portal Payments ───────────────────────────────────────

export function PortalPaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cust } = await fetchPortalCustomer(user?.id, user?.email)
      if (cust) {
        const { data } = await fetchPaymentsByCustomer(cust.id)
        setPayments(data || [])
      }
    } catch (err) {
      console.warn('Portal payments load fallback:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const filtered = payments.filter((p) =>
    `${p.id || p.payment_number || ''} ${p.reference || ''} ${p.payment_method || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Payment History</h1>
          <p>Your transactions, settlement references, and payment receipts</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search payments by number or reference…" />

      {loading ? (
        <LoadingState label="Loading transaction history…" />
      ) : (
        <div className="portal-payment-list">
          {filtered.map((p, idx) => (
            <article className="portal-payment-card" key={p.id || idx}>
              <div className="portal-payment-main">
                <div className="portal-payment-icon">
                  <CreditCard size={18} />
                </div>
                <div className="portal-payment-info">
                  <strong>{p.payment_number || p.id}</strong>
                  <small>{p.payment_method || 'Online Payment'} · Ref: {p.reference || 'N/A'}</small>
                </div>
                <div className="portal-payment-right">
                  <strong>₹{(Number(p.amount) || 0).toLocaleString()}</strong>
                  <StatusBadge>{p.status || 'paid'}</StatusBadge>
                </div>
              </div>
              <div className="portal-payment-date">
                <small>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</small>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <div className="empty-state">No payment records found.</div>}
        </div>
      )}
    </>
  )
}

// ─── Portal Settings / Account Profile ─────────────────────

export function PortalSettingsPage() {
  const { user, profile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cust } = await fetchPortalCustomer(user?.id, user?.email)
      if (cust) setCustomer(cust)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const form = e.target
    const updates = {
      phone: form.phone.value.trim() || null,
      billing_address: form.billing_address.value.trim() || null,
    }

    if (customer?.id) {
      await updateCustomer(customer.id, updates)
      setCustomer((prev) => ({ ...prev, ...updates }))
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <LoadingState label="Loading account settings…" />

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Account Settings</h1>
          <p>Manage your organization details and billing contact profile</p>
        </div>
      </div>

      {saved && (
        <div className="state-message" style={{ background: '#eaf5ea', color: '#1b631b', borderColor: '#b8e3b8', marginBottom: '14px' }}>
          <CheckCircle2 size={18} /> Billing profile saved successfully.
        </div>
      )}

      <div className="panel" style={{ maxWidth: '640px' }}>
        <form className="modal-form" onSubmit={handleSave}>
          <label>
            Full Name / Contact Name
            <input disabled value={profile?.full_name || customer?.name || ''} style={{ background: '#f4f6f3' }} />
            <small>Name is tied to your account login profile.</small>
          </label>

          <label>
            Email Address
            <input disabled value={user?.email || customer?.email || ''} style={{ background: '#f4f6f3' }} />
            <small>Email address used for authentication.</small>
          </label>

          <label>
            Billing Phone
            <input name="phone" defaultValue={customer?.phone || ''} placeholder="+91 98765 43210" />
          </label>

          <label>
            Billing Address / Tax Jurisdiction
            <input name="billing_address" defaultValue={customer?.billing_address || ''} placeholder="Registered address, City, State, PIN" />
          </label>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </form>
      </div>
    </>
  )
}
