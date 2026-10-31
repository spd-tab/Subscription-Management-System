import { useState, useEffect, useCallback } from 'react'
import { Plus, ArrowRight, Download, CreditCard, Building2, Banknote, FileCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, MetricCard, SearchBar, FilterDropdown, DataTable, StatusBadge, Modal, Pagination } from '../components/common/UI'
import { fetchPayments, createPayment } from '../services/supabase/queries'
import { payments as mockPayments } from '../data/mockData'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const perPage = 8

  const loadPayments = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await fetchPayments({ search, status: statusFilter, page, perPage })
    if (!error && data) {
      setPayments(data)
      setTotalCount(count ?? data.length)
    } else {
      setPayments(mockPayments)
      setTotalCount(mockPayments.length)
    }
    setLoading(false)
  }, [search, statusFilter, page])

  useEffect(() => { loadPayments() }, [loadPayments])

  // Compute summary metrics
  const totalPaid = payments.filter((p) => p.status === 'Paid' || p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalPending = payments.filter((p) => p.status === 'Pending' || p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalConfirmed = payments.filter((p) => p.status === 'Confirmed' || p.status === 'confirmed').reduce((sum, p) => sum + (p.amount || 0), 0)

  const columns = ['Payment', 'Customer', 'Method', 'Amount', 'Date', 'Status']
  const rows = payments.map((p) => [
    p.payment_number || p.id,
    p.customer_name || p.customer,
    p.method,
    `$${(p.amount || 0).toLocaleString()}`,
    p.paid_at || p.date || '-',
    p.status,
  ])

  const methodIcon = (method) => {
    const m = (method || '').toLowerCase()
    if (m.includes('card') || m.includes('visa') || m.includes('stripe')) return <CreditCard size={16} />
    if (m.includes('ach')) return <Building2 size={16} />
    if (m.includes('wire')) return <Banknote size={16} />
    return <FileCheck size={16} />
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    const form = e.target
    const payment = {
      payment_number: `PAY-${Date.now().toString().slice(-4)}`,
      customer_name: form.customer.value,
      invoice_id: form.invoice.value || null,
      amount: parseFloat(form.amount.value),
      method: form.method.value,
      status: 'paid',
      reference: form.reference.value || null,
      notes: form.notes.value || null,
      paid_at: new Date().toISOString(),
    }
    const { error } = await createPayment(payment)
    if (!error) {
      setShowForm(false)
      loadPayments()
    }
  }

  return (
    <>
      <div className="breadcrumbs">
        <Link to="/admin/dashboard">Workspace</Link>
        <span>/</span>
        Payments
      </div>

      <div className="page-heading">
        <div>
          <h1>Payments</h1>
          <p>Review transactions and record payment activity</p>
        </div>
        <div className="heading-actions">
          <Button variant="secondary" aria-label="Export payments">
            <Download size={18} /> Export
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} /> Record Payment
          </Button>
        </div>
      </div>

      <div className="module-metrics">
        <MetricCard
          label="Total Collected"
          value={`$${totalPaid.toLocaleString()}`}
          delta="All time"
        />
        <MetricCard
          label="Pending"
          value={`$${totalPending.toLocaleString()}`}
          delta={`${payments.filter((p) => p.status === 'Pending' || p.status === 'pending').length} transactions`}
        />
        <MetricCard
          label="Confirmed"
          value={`$${totalConfirmed.toLocaleString()}`}
          delta="Awaiting clearing"
        />
      </div>

      <section className="panel module-table-panel">
        <div className="module-toolbar">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1) }}
            placeholder="Search payments by ID, customer, or reference…"
          />
          <FilterDropdown
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1) }}
            options={[
              { value: 'all', label: 'All payments' },
              { value: 'paid', label: 'Paid' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          renderCell={(cell, row, cellIndex) => {
            if (cellIndex === 2) return <span className="method-cell">{methodIcon(cell)} {cell}</span>
            if (cellIndex === row.length - 1) return <StatusBadge>{cell}</StatusBadge>
            return cell
          }}
          renderActions={(row) => (
            <Link to={`/admin/payments`} className="table-link">
              View <ArrowRight size={14} />
            </Link>
          )}
          emptyText={loading ? 'Loading payments…' : 'No payments found.'}
        />

        <Pagination
          page={page}
          pages={Math.max(1, Math.ceil(totalCount / perPage))}
          onChange={setPage}
        />
      </section>

      {showForm && (
        <Modal title="Record Payment" onClose={() => setShowForm(false)}>
          <form className="modal-form" onSubmit={handleRecordPayment}>
            <label>
              Customer name
              <input name="customer" required placeholder="Enter customer name" />
            </label>

            <label>
              Invoice ID (optional)
              <input name="invoice" placeholder="e.g. INV-2025-1048" />
            </label>

            <label>
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" />
            </label>

            <label>
              Payment method
              <select name="method" required defaultValue="card">
                <option value="card">Credit/Debit Card</option>
                <option value="ach">ACH Transfer</option>
                <option value="wire">Wire Transfer</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              Reference number (optional)
              <input name="reference" placeholder="Transaction reference" />
            </label>

            <label>
              Notes (optional)
              <input name="notes" placeholder="Additional notes" />
            </label>

            <Button type="submit">Record Payment</Button>
            <small>Payment will be recorded and linked to the invoice if provided.</small>
          </form>
        </Modal>
      )}
    </>
  )
}
