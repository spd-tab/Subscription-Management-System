
import { lazy, Suspense, useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  Clock3,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  UsersRound,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  customers,
  dashboardStats,
  invoices,
  subscriptions,
} from '../data/mockData'
import {
  Button,
  MetricCard,
  Modal,
  SearchBar,
  StatusBadge,
} from '../components/common/UI'
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
} from '../services/customersService'

const TrendChart = lazy(() => import('../components/charts/TrendChart.jsx'))

const trendData = [
  { month: 'Dec', value: 96 },
  { month: 'Jan', value: 108 },
  { month: 'Feb', value: 116 },
  { month: 'Mar', value: 126 },
  { month: 'Apr', value: 138 },
  { month: 'May', value: 148 },
]

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

// ==================== DASHBOARD PAGE ====================

export function DashboardPage() {
  const quick = [
    ['New Sub', '/admin/subscriptions', <Zap size={19} />],
    ['Invoice', '/admin/invoices', <span className="quick-receipt">▤</span>],
    ['Customer', '/admin/customers', <UsersRound size={19} />],
    ['Payment', '/admin/payments', <span className="quick-receipt">▣</span>],
  ]

  return (
    <>
      <div className="eyebrow">
        <span className="health-dot" />
        EXECUTIVE VIEW
        <button className="date-pill">
          <CalendarDays size={15} /> May 2025⌄
        </button>
      </div>

      <PageHeading
        title="Executive Dashboard"
        description="Financial health, active revenue, & retention health"
      />

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
        {dashboardStats.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <section className="panel trend-panel">
        <div className="panel-heading">
          <div>
            <h2>MRR Compounding Trend</h2>
            <p>Dec 2024 – May 2025 trailing growth</p>
          </div>
          <span className="growth-tag">+28.3% YTD</span>
        </div>

        <Suspense
          fallback={
            <div className="chart-wrap state-message">
              Loading revenue trend…
            </div>
          }
        >
          <TrendChart data={trendData} />
        </Suspense>
      </section>

      <section className="panel cohort-panel">
        <div className="panel-heading">
          <div>
            <h2>Cohort Distribution</h2>
            <p>1,842 total accounts monitored</p>
          </div>
          <strong>98.1% Health</strong>
        </div>

        <div className="cohort-bar">
          <i />
          <i />
          <i />
          <i />
        </div>

        <div className="cohort-legend">
          <span>● Active <b>82% (1,510)</b></span>
          <span>● In Trial <b>10% (184)</b></span>
          <span>● Paused <b>5% (92)</b></span>
          <span className="danger-text">
            ● Churned <b>3% (56)</b>
          </span>
        </div>
      </section>

      <div className="section-caption ledger-caption">
        REAL-TIME LEDGER <span className="live-dot" />{' '}
        <Link to="/admin/payments">View All</Link>
      </div>

      <section className="panel ledger-list">
        {[
          ['AC', 'Acme Corp', 'Enterprise Renewal • 10m ago', '+$2,400', 'ACTIVE'],
          ['LF', 'Linearflow Inc', 'Team Plan Upgrade • 1h ago', '+$490', 'CONFIRMED'],
          ['NL', 'Nordic Labs', '#INV-2025-089 • Due 2d', '$1,150', 'PENDING'],
          ['VS', 'Vertex Systems', 'Wire Transfer #TX-9011', '+$3,600', 'PAID'],
        ].map(([initials, name, detail, amount, status]) => (
          <div className="ledger-row" key={name}>
            <span className="avatar ledger-avatar">{initials}</span>

            <div className="ledger-description">
              <strong>{name}</strong>
              <small>{detail}</small>
            </div>

            <div className="ledger-amount">
              <strong>
                {amount}
                <small>{status === 'ACTIVE' ? '/mo' : ''}</small>
              </strong>
              <StatusBadge>{status}</StatusBadge>
            </div>
          </div>
        ))}
      </section>
    </>
  )
}

// ==================== CUSTOMERS PAGE ====================

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [customerList, setCustomerList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    billing_address: '',
  })

  // Fetch customers from Supabase
  async function loadCustomers() {
    try {
      setError('')
      setLoading(true)

      const data = await fetchCustomers()
      setCustomerList(data)
    } catch (err) {
      setError(err.message || 'Unable to load customers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  // Open add customer form
  function openAddForm() {
    setEditingCustomer(null)

    setFormData({
      name: '',
      email: '',
      phone: '',
      billing_address: '',
    })

    setError('')
    setShowForm(true)
  }

  // Open edit customer form
  function openEditForm(customer) {
    setEditingCustomer(customer)

    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      billing_address: customer.billing_address || '',
    })

    setError('')
    setShowForm(true)
  }

  // Handle input changes
  function handleInputChange(event) {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // Add or update customer
  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      if (editingCustomer) {
        const updated = await updateCustomer(
          editingCustomer.id,
          formData
        )

        setCustomerList((previous) =>
          previous.map((customer) =>
            customer.id === updated.id ? updated : customer
          )
        )
      } else {
        const created = await createCustomer(formData)

        setCustomerList((previous) => [
          created,
          ...previous,
        ])
      }

      setShowForm(false)
      setEditingCustomer(null)
    } catch (err) {
      setError(err.message || 'Unable to save customer.')
    } finally {
      setSaving(false)
    }
  }

  // Search customers
  const filtered = customerList.filter((customer) =>
    `${customer.name || ''} ${customer.email || ''} ${customer.phone || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <>
      <PageHeading
        title="Customers"
        description="Manage customer accounts and billing profiles"
      >
        <Button onClick={openAddForm}>
          <Plus size={19} /> Add Customer
        </Button>
      </PageHeading>

      {/* Customer metrics */}
      <div className="customer-metrics">
        <MetricCard
          label="Total Customers"
          value={customerList.length.toString()}
          delta="Database records"
        />

        <MetricCard
          label="With Phone"
          value={customerList
            .filter((customer) => customer.phone)
            .length.toString()}
          delta="Contact details"
        />

        <MetricCard
          label="With Billing Address"
          value={customerList
            .filter((customer) => customer.billing_address)
            .length.toString()}
          delta="Billing profiles"
        />
      </div>

      {/* Search */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, or phone..."
      />

      {/* Loading and error messages */}
      {error && !showForm && (
        <div className="empty-state">
          {error}
          <button onClick={loadCustomers}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="state-message">
          Loading customers...
        </div>
      ) : (
        <>
          <div className="table-caption">
            <span>Showing {filtered.length} customers</span>
            <span>Sorted by recently added</span>
          </div>

          {/* Customer cards */}
          <div className="customer-cards">
            {filtered.map((customer, index) => (
              <article
                className="customer-card"
                key={customer.id}
              >
                <div className="customer-top">
                  <span
                    className={`company-avatar company-${index % 6}`}
                  >
                    {(customer.name || 'C')
                      .split(' ')
                      .map((word) => word[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </span>

                  <div className="customer-identity">
                    <strong>{customer.name}</strong>
                    <span>{customer.email}</span>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => openEditForm(customer)}
                  >
                    Edit
                  </Button>
                </div>

                <div className="customer-stats">
                  <div>
                    <small>Phone</small>
                    <span>
                      {customer.phone || 'Not provided'}
                    </span>
                  </div>

                  <div>
                    <small>Billing Address</small>
                    <span>
                      {customer.billing_address || 'Not provided'}
                    </span>
                  </div>
                </div>

                <div className="customer-meta">
                  <small>
                    Added{' '}
                    {customer.created_at
                      ? new Date(
                          customer.created_at
                        ).toLocaleDateString()
                      : 'Date unavailable'}
                  </small>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              {search
                ? 'No customers match your search.'
                : 'No customers found. Add your first customer.'}
            </div>
          )}
        </>
      )}

      {/* Add / Edit customer modal */}
      {showForm && (
        <Modal
          title={
            editingCustomer
              ? 'Edit Customer'
              : 'Add Customer'
          }
          onClose={() => {
            if (!saving) setShowForm(false)
          }}
        >
          <form
            className="modal-form"
            onSubmit={handleSubmit}
          >
            <label>
              Customer Name
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Company or customer name"
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="name@company.com"
              />
            </label>

            <label>
              Phone
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Phone number"
              />
            </label>

            <label>
              Billing Address
              <textarea
                name="billing_address"
                value={formData.billing_address}
                onChange={handleInputChange}
                placeholder="Enter billing address"
                rows={3}
              />
            </label>

            {error && (
              <p className="danger-text">{error}</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingCustomer
                  ? 'Save Changes'
                  : 'Add Customer'}
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}

// ==================== SUBSCRIPTIONS PAGE ====================

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
        description="1,842 active contracts across global entities"
      >
        <Button onClick={() => setShowForm(true)}>
          <Plus size={19} /> New
        </Button>
      </PageHeading>

      <div className="subscription-metrics">
        <MetricCard label="Total MRR" value="$148,250" delta="+4.2% MoM" />
        <MetricCard label="Avg contract" value="$80.48/mo" delta="Weighted" />
        <MetricCard label="Net churn" value="0.8%" delta="-0.3% target" />
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
            {tab === 'Active'
              ? ' (1,510)'
              : tab === 'Quotation'
                ? ' (85)'
                : tab === 'Paused'
                  ? ' (64)'
                  : ''}
          </button>
        ))}
      </div>

      <div className="subscription-list">
        {filtered.map((sub, index) => (
          <article
            className="subscription-card"
            key={sub.id}
          >
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
                <small>/ {sub.billing.toLowerCase()}</small>
              </strong>
              <span>
                ${sub.monthly.toLocaleString()} / mo equiv
              </span>
            </div>

            <div className="subscription-renewal">
              <RefreshCw size={15} />{' '}
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
                <Button variant="secondary">
                  Upgrade
                </Button>
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
        <span>Showing 1–{filtered.length} of 1,842</span>
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
                  <option key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Plan
              <input
                required
                placeholder="Select or enter a plan"
              />
            </label>

            <Button type="submit">
              Create subscription
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}

// ==================== INVOICES PAGE ====================

export function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All Invoices')
  const [showForm, setShowForm] = useState(false)

  const filtered = invoices.filter(
    (invoice) =>
      (filter === 'All Invoices' ||
        (filter === 'Paid'
          ? invoice.status === 'Paid'
          : invoice.status !== 'Paid')) &&
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
        <Button
          variant="secondary"
          aria-label="Download invoices"
        >
          <ArrowDownToLine size={18} />
        </Button>

        <Button
          variant="secondary"
          aria-label="Invoice history"
        >
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
        <MetricCard label="Paid (30d)" value="$134,800" delta="↗ +12.4%" />
        <MetricCard label="Pending" value="$18,490" delta="4 accounts" />
        <MetricCard
          label="Overdue"
          value="$3,200"
          delta="Action req."
          tone="danger"
        />
      </div>

      <div className="collection-health">
        <span className="icon-tile">
          <TrendingUp size={19} />
        </span>

        <div>
          <strong>Auto-Collection Health</strong>
          <small>97.8% collected on Net 15 cycle</small>
        </div>

        <svg viewBox="0 0 125 35" aria-hidden="true">
          <polyline points="2,24 24,20 42,25 62,13 82,16 103,7 121,11" />
        </svg>
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
            {tab === 'All Invoices'
              ? ' (24)'
              : tab === 'Paid'
                ? ' (18)'
                : ' (3)'}
          </button>
        ))}
      </div>

      <div className="invoice-list">
        {filtered.map((invoice) => (
          <article
            className="invoice-card"
            key={invoice.id}
          >
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
                    invoice.status === 'Overdue'
                      ? 'danger-text'
                      : ''
                  }
                >
                  ${invoice.amount.toLocaleString()}.00
                </strong>
                <StatusBadge>{invoice.status}</StatusBadge>
              </div>
            </div>

            <div
              className={`invoice-detail ${
                invoice.status === 'Overdue'
                  ? 'invoice-warning'
                  : ''
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
                  <Button className="danger-button">
                    Collect Now
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary">
                    Send Reminder
                  </Button>
                  <Button>Pay Link</Button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="pagination">
        <span>Showing 1–{filtered.length} of 24</span>
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
                  <option key={item.id}>
                    {item.name}
                  </option>
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

            <Button type="submit">
              Create draft
            </Button>

            <small>
              This creates a local demo draft only; it is not saved to a server.
            </small>
          </form>
        </Modal>
      )}
    </>
  )
}
