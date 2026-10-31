import { useState, useEffect, useCallback } from 'react'
import { CreditCard, FileText, RefreshCw, Settings, Tag, User, TrendingUp, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, MetricCard, SearchBar, StatusBadge, Modal } from '../components/common/UI'
import { fetchPaymentsByCustomer, fetchDiscounts, validateDiscountCode } from '../services/supabase/queries'
import { subscriptions as mockSubscriptions, invoices as mockInvoices, payments as mockPayments } from '../data/mockData'

// ─── Portal Dashboard ─────────────────────────────────────

export function PortalDashboardPage() {
  const { profile } = useAuth()
  const name = profile?.full_name || 'Customer'

  return (
    <>
      <div className="portal-welcome">
        <div className="portal-welcome-content">
          <h1>Welcome back, {name.split(' ')[0]}</h1>
          <p>Here's an overview of your Brightloop account and services.</p>
        </div>
        <div className="portal-welcome-badge">
          <span className="avatar portal-avatar">{name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
        </div>
      </div>

      <div className="portal-metrics">
        <MetricCard label="Active Subscriptions" value="2" delta="All running smoothly" />
        <MetricCard label="Next Invoice" value="$850" delta="Due Jun 01, 2025" />
        <MetricCard label="Total Paid (YTD)" value="$7,640" delta="+12% vs last year" />
      </div>

      <div className="portal-quick-links">
        <Link to="/portal/subscriptions" className="portal-quick-card">
          <RefreshCw size={22} />
          <div>
            <strong>My Subscriptions</strong>
            <small>View and manage your plans</small>
          </div>
        </Link>
        <Link to="/portal/invoices" className="portal-quick-card">
          <FileText size={22} />
          <div>
            <strong>Invoices</strong>
            <small>View billing history</small>
          </div>
        </Link>
        <Link to="/portal/payments" className="portal-quick-card">
          <CreditCard size={22} />
          <div>
            <strong>Payments</strong>
            <small>Recent transactions</small>
          </div>
        </Link>
      </div>

      <section className="panel portal-activity">
        <h2>Recent Activity</h2>
        <div className="portal-activity-list">
          {[
            { icon: <CreditCard size={17} />, text: 'Payment of $850.00 received', detail: 'Scale Tier · Monthly', time: '2 days ago', status: 'Paid' },
            { icon: <FileText size={17} />, text: 'Invoice #INV-2025-1048 generated', detail: 'Enterprise Plan', time: '5 days ago', status: 'Pending' },
            { icon: <RefreshCw size={17} />, text: 'Subscription renewed', detail: 'Enterprise Dedicated · Annual', time: '2 weeks ago', status: 'Active' },
          ].map((item, idx) => (
            <div className="portal-activity-row" key={idx}>
              <span className="portal-activity-icon">{item.icon}</span>
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
      </section>
    </>
  )
}

// ─── Portal Subscriptions ──────────────────────────────────

export function PortalSubscriptionsPage() {
  const subs = mockSubscriptions.slice(0, 2) // Customer sees their own subs

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>My Subscriptions</h1>
          <p>Manage your active plans and renewals</p>
        </div>
      </div>

      <div className="portal-sub-grid">
        {subs.map((sub) => (
          <article className="portal-sub-card" key={sub.id}>
            <div className="portal-sub-header">
              <div>
                <h3>{sub.plan}</h3>
                <small>{sub.billing} billing</small>
              </div>
              <StatusBadge>{sub.status}</StatusBadge>
            </div>

            <div className="portal-sub-price">
              <strong>${sub.amount.toLocaleString()}</strong>
              <span>/ {sub.billing.toLowerCase()}</span>
            </div>

            <div className="portal-sub-details">
              <div className="portal-sub-detail">
                <Calendar size={15} />
                <span>Renews {sub.renews}</span>
              </div>
              <div className="portal-sub-detail">
                <RefreshCw size={15} />
                <span>{sub.note}</span>
              </div>
            </div>

            <div className="portal-sub-actions">
              <Button variant="secondary">Manage Plan</Button>
              {sub.status === 'Active' && <Button variant="secondary">Cancel</Button>}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

// ─── Portal Invoices ───────────────────────────────────────

export function PortalInvoicesPage() {
  const [search, setSearch] = useState('')
  const invs = mockInvoices.filter((inv) =>
    `${inv.id} ${inv.customer}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>My Invoices</h1>
          <p>View your invoices and payment status</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search invoices…" />

      <div className="portal-invoice-list">
        {invs.map((inv) => (
          <article className="portal-invoice-card" key={inv.id}>
            <div className="portal-invoice-main">
              <div className="portal-invoice-id">
                <FileText size={18} />
                <div>
                  <strong>#{inv.id}</strong>
                  <small>{inv.date}</small>
                </div>
              </div>
              <div className="portal-invoice-amount">
                <strong className={inv.status === 'Overdue' ? 'danger-text' : ''}>
                  ${inv.amount.toLocaleString()}.00
                </strong>
                <StatusBadge>{inv.status}</StatusBadge>
              </div>
            </div>
            <div className="portal-invoice-footer">
              <span>{inv.plan}</span>
              {inv.status === 'Paid' && <Button variant="secondary">Download PDF</Button>}
              {inv.status === 'Pending' && <Button>Pay Now</Button>}
              {inv.status === 'Overdue' && <Button className="danger-button">Pay Now</Button>}
            </div>
          </article>
        ))}
        {invs.length === 0 && <div className="empty-state">No invoices found.</div>}
      </div>
    </>
  )
}

// ─── Portal Payments ───────────────────────────────────────

export function PortalPaymentsPage() {
  const [payments, setPayments] = useState(mockPayments)
  const [search, setSearch] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      fetchPaymentsByCustomer(user.id).then(({ data }) => {
        if (data && data.length > 0) setPayments(data)
      })
    }
  }, [user])

  const filtered = payments.filter((p) =>
    `${p.id || p.payment_number || ''} ${p.customer || p.customer_name || ''} ${p.method || p.payment_method || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Payment History</h1>
          <p>Your recent transactions and payment activity</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search payments…" />

      <div className="portal-payment-list">
        {filtered.map((p, idx) => (
          <article className="portal-payment-card" key={p.id || idx}>
            <div className="portal-payment-main">
              <div className="portal-payment-icon">
                <CreditCard size={18} />
              </div>
              <div className="portal-payment-info">
                <strong>{p.id || p.payment_number}</strong>
                <small>{p.method || p.payment_method || 'Online Payment'}</small>
              </div>
              <div className="portal-payment-right">
                <strong>₹{(Number(p.amount) || 0).toLocaleString()}</strong>
                <StatusBadge>{p.status || 'paid'}</StatusBadge>
              </div>
            </div>
            <div className="portal-payment-date">
              <small>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : p.paid_at || p.date || '-'}</small>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <div className="empty-state">No payments found.</div>}
      </div>
    </>
  )
}
