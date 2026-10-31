
import { lazy, Suspense, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  Clock3,
  Globe2,
  Phone,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  UsersRound,
  Zap,
} from 'lucide-react'

import { Link, useNavigate } from 'react-router-dom'

import {
  customers,
  invoices,
  subscriptions,
} from '../data/mockData'

import { useDashboardData } from '../hooks/useDashboardData'

import {
  Button,
  MetricCard,
  Modal,
  SearchBar,
  StatusBadge,
} from '../components/common/UI'

const TrendChart = lazy(() => import('../components/charts/TrendChart.jsx'))

const trendData = [
  { month: 'Dec', value: 96 },
  { month: 'Jan', value: 108 },
  { month: 'Feb', value: 116 },
  { month: 'Mar', value: 126 },
  { month: 'Apr', value: 138 },
  { month: 'May', value: 148 },
]

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0))

function PageHeading({ title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {children && <div className="heading-actions">{children}</div>}
    </div>
  )
}

// ==========================================
// DASHBOARD PAGE - SUPABASE CONNECTED
// ==========================================

export function DashboardPage() {
  const [period, setPeriod] = useState('May 2025')

  const {
    customers: liveCustomers,
    subscriptions: liveSubscriptions,
    invoices: liveInvoices,
    payments: livePayments,
    loading,
    error,
    stats,
  } = useDashboardData()

  const quick = [
    ['New Sub', '/admin/subscriptions', <Zap size={19} />],
    ['Invoice', '/admin/invoices', <span className="quick-receipt">▤</span>],
    ['Customer', '/admin/customers', <UsersRound size={19} />],
    ['Payment', '/admin/payments', <span className="quick-receipt">▣</span>],
  ]

  const activeCount = liveSubscriptions.filter(
    (sub) => sub.status?.toLowerCase() === 'active'
  ).length

  const pausedCount = liveSubscriptions.filter(
    (sub) => sub.status?.toLowerCase() === 'paused'
  ).length

  const quotationCount = liveSubscriptions.filter(
    (sub) => sub.status?.toLowerCase() === 'quotation'
  ).length

  const liveStats = [
    {
      label: 'Total Customers',
      value: stats.totalCustomers.toLocaleString('en-IN'),
      delta: 'Registered customers',
      icon: 'users',
    },
    {
      label: 'MRR run-rate',
      value: 'Not available',
      delta: 'Plan pricing not connected yet',
      icon: 'trend',
    },
    {
      label: 'Active subs',
      value: stats.activeSubscriptions.toLocaleString('en-IN'),
      delta: 'Active subscriptions',
      icon: 'users',
    },
    {
      label: 'Outstanding',
      value: formatINR(stats.outstandingAmount),
      delta: 'Unpaid invoice balance',
      icon: 'clock',
    },
    {
      label: 'Overdue',
      value: formatINR(stats.overdueAmount),
      delta: `${stats.overdueCount} overdue invoices`,
      icon: 'alert',
      tone: 'danger',
    },
    {
      label: 'Paid Revenue',
      value: formatINR(stats.totalPaid),
      delta: 'Successful payments',
      icon: 'trend',
    },
  ]

  // Match each payment to its invoice and customer.
  const recentPayments = [...livePayments]
    .sort(
      (a, b) =>
        new Date(b.payment_date || b.created_at) -
        new Date(a.payment_date || a.created_at)
    )
    .slice(0, 5)
    .map((payment) => {
      const invoice = liveInvoices.find(
        (item) => item.id === payment.invoice_id
      )

      const customer = liveCustomers.find(
        (item) => item.id === invoice?.customer_id
      )

      return {
        ...payment,
        customerName: customer?.name || 'Customer',
      }
    })

  return (
    <>
      <div className="eyebrow">
        <span className="health-dot" />
        EXECUTIVE VIEW

        <select
          className="date-pill"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option>May 2025</option>
          <option>April 2025</option>
          <option>March 2025</option>
        </select>
      </div>

      <PageHeading
        title="Executive Dashboard"
        description="Monitor revenue, subscriptions, invoices and customer activity."
      />

      {loading && (
        <div className="panel state-message">
          Loading dashboard data from Supabase...
        </div>
      )}

      {error && (
        <div className="panel state-message">
          <strong>Unable to load live dashboard data.</strong>
          <p>{error}</p>
          <p>
            Check your Supabase connection, .env file and table permissions.
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="section-caption">
            OPERATIONS <span>4 shortcuts</span>
          </div>

          <div className="quick-actions">
            {quick.map(([label, path, icon]) => (
              <Link to={path} className="quick-action" key={label}>
                <span>{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          <div className="metric-grid">
            {liveStats.map((item) => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>

          <section className="panel trend-panel">
            <div className="panel-heading">
              <div>
                <h2>Monthly Recurring Revenue</h2>
                <p>
                  Sample trend only. Live revenue history is not connected yet.
                </p>
              </div>

              <span className="growth-tag">Demo Trend</span>
            </div>

            <Suspense
              fallback={
                <div className="chart-wrap state-message">
                  Loading revenue trend...
                </div>
              }
            >
              <TrendChart data={trendData} />
            </Suspense>
          </section>

          <section className="panel cohort-panel">
            <div className="panel-heading">
              <div>
                <h2>Subscription Overview</h2>
                <p>Live subscription status breakdown</p>
              </div>

              <strong>{liveSubscriptions.length} Total</strong>
            </div>

            <div className="cohort-legend">
              <span>
                ● Active <b>{activeCount}</b>
              </span>

              <span>
                ● Paused <b>{pausedCount}</b>
              </span>

              <span>
                ● Quotation <b>{quotationCount}</b>
              </span>
            </div>
          </section>

          <section className="panel cohort-panel">
            <div className="panel-heading">
              <div>
                <h2>Outstanding Invoices</h2>
                <p>Live unpaid invoice summary</p>
              </div>

              <Link to="/admin/invoices">View Invoices</Link>
            </div>

            <div className="customer-metrics">
              <MetricCard
                label="Outstanding"
                value={formatINR(stats.outstandingAmount)}
                delta="Unpaid invoice balance"
              />

              <MetricCard
                label="Overdue"
                value={formatINR(stats.overdueAmount)}
                delta={`${stats.overdueCount} overdue invoices`}
                tone="danger"
              />
            </div>
          </section>

          <div className="section-caption ledger-caption">
            RECENT PAYMENTS & ACTIVITIES
            <span className="live-dot" />
            <Link to="/admin/payments">View All</Link>
          </div>

          <section className="panel ledger-list">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment, index) => (
                <div
                  className="ledger-row"
                  key={payment.id || index}
                >
                  <span className="avatar ledger-avatar">
                    {payment.customerName
                      .split(' ')
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join('')}
                  </span>

                  <div className="ledger-description">
                    <strong>{payment.customerName}</strong>
                    <small>
                      {payment.payment_number || 'Payment'} •{' '}
                      {payment.payment_method || 'Payment'} •{' '}
                      {payment.payment_date
                        ? new Date(payment.payment_date).toLocaleDateString('en-IN')
                        : ''}
                    </small>
                  </div>

                  <div className="ledger-amount">
                    <strong>{formatINR(payment.amount)}</strong>

                    <StatusBadge>
                      {(payment.status || 'Pending').toUpperCase()}
                    </StatusBadge>
                  </div>
                </div>
              ))
            ) : (
              <div className="state-message">
                No payments found in Supabase.
              </div>
            )}
          </section>

          <section className="panel cohort-panel">
            <div className="panel-heading">
              <div>
                <h2>Payment Summary</h2>
                <p>Total successful payments from Supabase</p>
              </div>

              <strong>{formatINR(stats.totalPaid)}</strong>
            </div>
          </section>
        </>
      )}
    </>
  )
}

// ==========================================
// CUSTOMERS PAGE
// ==========================================

export function CustomersPage() {
  const [customerList, setCustomerList] = useState(customers)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)

  const navigate = useNavigate()

  const filtered = customers.filter(
    (customer) =>
      (
        filter === 'All' ||
        (
          filter === 'At Risk'
            ? customer.status !== 'Healthy'
            : filter === 'High MRR'
              ? customer.mrr >= 2000
              : customer.segment === filter
        )
      ) &&
      `${customer.name} ${customer.email} ${customer.contact}`
        .toLowerCase()
        .includes(search.toLowerCase())
  )

  return (
    <>
      <PageHeading
        title="Customers"
        description="Manage accounts and billing profiles"
      >
        <Button onClick={() => setShowForm(true)}>
          <Plus size={19} /> Add Customer
        </Button>
      </PageHeading>

      <div className="customer-metrics">
        <MetricCard
          label="Total accounts"
          value={customers.length.toString()}
          delta="Available demo customers"
        />

        <MetricCard
          label="Avg MRR"
          value={`$${Math.round(
            customers.reduce((sum, customer) => sum + customer.mrr, 0) /
              customers.length
          ).toLocaleString()}`}
          delta="Per customer"
        />

        <MetricCard
          label="Healthy accounts"
          value={customers.filter((customer) => customer.status === 'Healthy').length.toString()}
          delta="Available demo data"
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Lookup by name, email, or domain..."
      />

      <div className="filter-tabs">
        {['All', 'Enterprise', 'SMB', 'At Risk', 'High MRR'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={filter === tab ? 'selected' : ''}
          >
            {tab}
            {tab === 'All' ? ` (${customers.length})` : ''}
          </button>
        ))}
      </div>

      <div className="table-caption">
        <span>Showing {filtered.length} accounts</span>
        <span>↕ Sorted by MRR</span>
      </div>

      <div className="customer-cards">
        {filtered.map((customer, index) => (
          <article
            className="customer-card"
            key={customer.id}
            onClick={() => navigate(`/admin/customers/${customer.id}`)}
          >
            <div className="customer-top">
              <span className={`company-avatar company-${index}`}>
                {customer.name
                  .split(' ')
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join('')}
              </span>

              <div className="customer-identity">
                <strong>{customer.name}</strong>
                <span>
                  {customer.contact} • {customer.email}
                </span>
              </div>

              <StatusBadge>{customer.status}</StatusBadge>
            </div>

            <div className="customer-stats">
              <div>
                <small>Subscriptions</small>
                <span>
                  {customer.subscriptions} Active
                  <em> (${customer.mrr.toLocaleString()}/mo)</em>
                </span>
              </div>

              <div>
                <small>Invoices</small>
                <span>{customer.invoices}</span>
              </div>
            </div>

            <div className="customer-meta">
              <span>
                <Phone size={15} /> {customer.phone}
              </span>

              <span>
                <Globe2 size={15} /> {customer.region}
              </span>

              <small>Added {customer.added}</small>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          No accounts match your search.
        </div>
      )}

      {showForm && (
        <Modal
          title="Add customer"
          onClose={() => setShowForm(false)}
        >
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault()
              setShowForm(false)
            }}
          >
            <label>
              Company name
              <input required placeholder="Company, Inc." />
            </label>

            <label>
              Contact email
              <input
                required
                type="email"
                placeholder="name@company.com"
              />
            </label>

            <Button type="submit">Add customer</Button>
          </form>
        </Modal>
      )}
    </>
  )
}

// ==========================================
// SUBSCRIPTIONS PAGE
// ==========================================

export function SubscriptionsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)

  const filtered = subscriptions.filter(
    (sub) =>
      (filter === 'All' || sub.status === filter) &&
      `${sub.customer} ${sub.plan}`
        .toLowerCase()
        .includes(search.toLowerCase())
  )

  return (
    <>
      <PageHeading
        title="Subscriptions"
        description={`${subscriptions.length} subscriptions in available demo data`}
      >
        <Button onClick={() => setShowForm(true)}>
          <Plus size={19} /> New
        </Button>
      </PageHeading>

      <div className="subscription-metrics">
        <MetricCard
          label="Total MRR"
          value={`$${subscriptions
            .filter((sub) => sub.status === 'Active')
            .reduce((sum, sub) => sum + sub.monthly, 0)
            .toLocaleString()}`}
          delta="Active subscriptions"
        />

        <MetricCard
          label="Active"
          value={subscriptions.filter((sub) => sub.status === 'Active').length.toString()}
          delta="Available demo data"
        />

        <MetricCard
          label="Paused"
          value={subscriptions.filter((sub) => sub.status === 'Paused').length.toString()}
          delta="Available demo data"
        />
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search subscriptions, customers, plans..."
      />

      <div className="filter-tabs">
        {['All', 'Active', 'Quotation', 'Paused'].map((tab) => (
          <button
            key={tab}
            className={filter === tab ? 'selected' : ''}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="subscription-list">
        {filtered.map((sub, index) => (
          <article className="subscription-card" key={sub.id}>
            <div className="subscription-title">
              <span className={`company-avatar company-${index}`}>
                {sub.customer
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </span>

              <div>
                <strong>{sub.customer}</strong>
                <small>{sub.plan}</small>
              </div>

              <StatusBadge>{sub.status}</StatusBadge>
            </div>

            <div className="subscription-price">
              <strong>
                ${sub.amount.toLocaleString()}
                <small> / {sub.billing.toLowerCase()}</small>
              </strong>

              <span>
                ${sub.monthly.toLocaleString()} / mo equiv
              </span>
            </div>

            <div className="subscription-renewal">
              <RefreshCw size={15} />
              {sub.status === 'Paused'
                ? sub.note
                : `Renews ${sub.renews} • ${sub.note}`}
            </div>

            <div className="subscription-actions">
              <Button variant="secondary">
                {sub.status === 'Active'
                  ? 'Pause'
                  : sub.status === 'Paused'
                    ? 'Resume Service'
                    : 'Send Reminder'}
              </Button>

              {sub.status === 'Active' && (
                <Button variant="secondary">Upgrade</Button>
              )}

              <Link
                className="arrow-link"
                to={`/admin/subscriptions/${sub.id}`}
                aria-label="View subscription"
              >
                <ArrowRight size={18} />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="pagination">
        <span>Showing {filtered.length} demo subscriptions</span>

        <div>
          <button className="icon-button" disabled aria-label="Previous page">
            ‹
          </button>
          <button className="icon-button" aria-label="Next page">
            ›
          </button>
        </div>
      </div>

      {showForm && (
        <Modal
          title="Create subscription"
          onClose={() => setShowForm(false)}
        >
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault()
              setShowForm(false)
            }}
          >
            <label>
              Customer
              <select required defaultValue="">
                <option value="" disabled>
                  Select a customer
                </option>
                {customers.map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label>
              Plan
              <input required placeholder="Select or enter a plan" />
            </label>

            <Button type="submit">Create subscription</Button>
          </form>
        </Modal>
      )}
    </>
  )
}

// ==========================================
// INVOICES PAGE
// ==========================================

export function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All Invoices')
  const [showForm, setShowForm] = useState(false)

  const filtered = invoices.filter(
    (invoice) =>
      (
        filter === 'All Invoices' ||
        (
          filter === 'Paid'
            ? invoice.status === 'Paid'
            : filter === 'Confirmed / Unpaid'
              ? ['Pending', 'Overdue'].includes(invoice.status)
              : invoice.status !== 'Paid'
        )
      ) &&
      `${invoice.id} ${invoice.customer}`
        .toLowerCase()
        .includes(search.toLowerCase())
  )

  return (
    <>
      <PageHeading
        title="Invoices"
        description="Billing schedules & collections"
      >
        <Button variant="secondary" aria-label="Download invoices">
          <ArrowDownToLine size={18} />
        </Button>

        <Button variant="secondary" aria-label="Invoice history">
          <Clock3 size={18} />
        </Button>
      </PageHeading>

      <div className="invoice-actions">
        <Button variant="secondary">
          <Zap size={17} /> Generate Due
        </Button>

        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} /> Create Invoice
        </Button>
      </div>

      <div className="invoice-metrics">
        <MetricCard
          label="Paid"
          value={`$${invoices
            .filter((invoice) => invoice.status === 'Paid')
            .reduce((sum, invoice) => sum + invoice.amount, 0)
            .toLocaleString()}`}
          delta="Available demo data"
        />

        <MetricCard
          label="Pending"
          value={`$${invoices
            .filter((invoice) => invoice.status === 'Pending')
            .reduce((sum, invoice) => sum + invoice.amount, 0)
            .toLocaleString()}`}
          delta="Unpaid invoices"
        />

        <MetricCard
          label="Overdue"
          value={`$${invoices
            .filter((invoice) => invoice.status === 'Overdue')
            .reduce((sum, invoice) => sum + invoice.amount, 0)
            .toLocaleString()}`}
          delta="Action required"
          tone="danger"
        />
      </div>

      <div className="collection-health">
        <span className="icon-tile">
          <TrendingUp size={19} />
        </span>

        <div>
          <strong>Invoice Collection Summary</strong>
          <small>Based on available demo invoices</small>
        </div>
      </div>

      <div className="search-row">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by invoice #, client, or entity..."
        />

        <button className="icon-button" aria-label="Filter invoices">
          <SlidersHorizontal size={19} />
        </button>
      </div>

      <div className="filter-tabs">
        {['All Invoices', 'Paid', 'Confirmed / Unpaid'].map((tab) => (
          <button
            key={tab}
            className={filter === tab ? 'selected' : ''}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="invoice-list">
        {filtered.map((invoice) => (
          <article className="invoice-card" key={invoice.id}>
            <div className="invoice-main">
              <span className="invoice-initials">
                {invoice.initials}
              </span>

              <div className="invoice-name">
                <strong>{invoice.customer}</strong>
                <small>#{invoice.id}</small>
              </div>

              <div className="invoice-value">
                <strong
                  className={
                    invoice.status === 'Overdue' ? 'danger-text' : ''
                  }
                >
                  ${invoice.amount.toLocaleString()}.00
                </strong>

                <StatusBadge>{invoice.status}</StatusBadge>
              </div>
            </div>

            <div
              className={`invoice-detail ${
                invoice.status === 'Overdue' ? 'invoice-warning' : ''
              }`}
            >
              <span>
                {invoice.status === 'Overdue' ? '⚠' : '▤'}{' '}
                {invoice.detail}
              </span>
            </div>

            <div className="invoice-footer">
              <span>{invoice.plan}</span>

              {invoice.status === 'Paid' ? (
                <>
                  <Button variant="secondary">▧ PDF</Button>
                  <Button variant="secondary">▤ Receipt</Button>
                </>
              ) : invoice.status === 'Overdue' ? (
                <>
                  <Button variant="secondary">Resend</Button>
                  <Button className="danger-button">Collect Now</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary">Send Reminder</Button>
                  <Button>Pay Link</Button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="pagination">
        <span>Showing {filtered.length} demo invoices</span>

        <div>
          <button className="icon-button" disabled>
            ‹
          </button>
          <span>Page 1</span>
          <button className="icon-button">
            ›
          </button>
        </div>
      </div>

      {showForm && (
        <Modal
          title="Create invoice"
          onClose={() => setShowForm(false)}
        >
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault()
              setShowForm(false)
            }}
          >
            <label>
              Customer
              <select required defaultValue="">
                <option value="" disabled>
                  Select a customer
                </option>
                {customers.map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label>
              Amount
              <input
                required
                type="number"
                min="1"
                placeholder="0.00"
              />
            </label>

            <Button type="submit">Create draft</Button>

            <small>
              This creates a local demo draft only; it is not saved to a server.
            </small>
          </form>
        </Modal>
      )}
    </>
  )
}
