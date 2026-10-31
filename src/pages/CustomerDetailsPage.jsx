import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Plus, Phone, Mail, MapPin, Calendar, FileText, RefreshCw, CreditCard, CheckCircle2 } from 'lucide-react'
import { Button, MetricCard, StatusBadge, Modal, LoadingState, ErrorState, EmptyState } from '../components/common/UI'
import { fetchCustomerById, updateCustomer, fetchCustomerSubscriptions, fetchCustomerInvoices } from '../services/supabase/queries'

export default function CustomerDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: custData, error: custErr } = await fetchCustomerById(id)
      if (custErr || !custData) {
        setError('Customer account not found.')
        setLoading(false)
        return
      }
      setCustomer(custData)

      const [subRes, invRes] = await Promise.all([
        fetchCustomerSubscriptions(custData.id),
        fetchCustomerInvoices(custData.id),
      ])

      setSubscriptions(subRes.data || [])
      setInvoices(invRes.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load customer details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const form = e.target
    const updates = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || null,
      billing_address: form.billing_address.value.trim() || null,
    }

    const { error: updateErr } = await updateCustomer(customer.id, updates)
    setSaving(false)

    if (!updateErr) {
      setCustomer((prev) => ({ ...prev, ...updates }))
      setEditing(false)
      setEditSuccess(true)
      setTimeout(() => setEditSuccess(false), 3000)
    } else {
      alert(updateErr.message || 'Failed to update customer.')
    }
  }

  if (loading) return <LoadingState label="Loading customer profile…" />
  if (error) return <ErrorState message={error} />
  if (!customer) return <EmptyState title="Customer not found" />

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0)
  const outstanding = Math.max(0, totalInvoiced - totalPaid)
  const activeSubs = subscriptions.filter((s) => s.status === 'active' || s.status === 'Active')

  return (
    <section className="feature-page customer-details-page">
      <div className="breadcrumbs">
        <Link to="/admin/customers">Customers</Link>
        <span>/</span>
        {customer.name}
      </div>

      <div className="page-heading">
        <div>
          <h1>{customer.name}</h1>
          <p>Account profile, subscriptions, and billing activity</p>
        </div>
        <div className="heading-actions">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Edit size={16} /> Edit Profile
          </Button>
          <Button onClick={() => navigate('/admin/subscriptions')}>
            <Plus size={16} /> New Subscription
          </Button>
        </div>
      </div>

      {editSuccess && (
        <div className="state-message" style={{ background: '#eaf5ea', color: '#1b631b', borderColor: '#b8e3b8' }}>
          <CheckCircle2 size={18} /> Customer profile updated successfully.
        </div>
      )}

      {/* Overview Metrics */}
      <div className="module-metrics">
        <MetricCard label="Active Subscriptions" value={activeSubs.length.toString()} delta={`${subscriptions.length} total`} />
        <MetricCard label="Total Invoiced" value={`₹${totalInvoiced.toLocaleString()}`} delta={`${invoices.length} invoices`} />
        <MetricCard label="Total Paid" value={`₹${totalPaid.toLocaleString()}`} delta="Settled balance" />
        <MetricCard label="Outstanding Balance" value={`₹${outstanding.toLocaleString()}`} delta={outstanding > 0 ? 'Pending' : 'All clear'} tone={outstanding > 0 ? 'danger' : undefined} />
      </div>

      {/* Profile Card */}
      <div className="panel">
        <h2 className="panel-title" style={{ fontSize: '15px', marginBottom: '14px' }}>Customer Contact & Billing Details</h2>
        <div className="feature-detail-grid">
          <div className="feature-detail-cell">
            <span>Primary Contact</span>
            <strong>{customer.name}</strong>
          </div>
          <div className="feature-detail-cell">
            <span>Email Address</span>
            <strong><Mail size={13} style={{ display: 'inline', marginRight: 4 }} /> {customer.email}</strong>
          </div>
          <div className="feature-detail-cell">
            <span>Phone</span>
            <strong><Phone size={13} style={{ display: 'inline', marginRight: 4 }} /> {customer.phone || 'Not specified'}</strong>
          </div>
          <div className="feature-detail-cell">
            <span>Billing Address</span>
            <strong><MapPin size={13} style={{ display: 'inline', marginRight: 4 }} /> {customer.billing_address || 'India'}</strong>
          </div>
          <div className="feature-detail-cell">
            <span>Customer ID</span>
            <strong><code style={{ fontSize: '11px' }}>{customer.id}</code></strong>
          </div>
          <div className="feature-detail-cell">
            <span>Customer Since</span>
            <strong><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} /> {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'Active'}</strong>
          </div>
        </div>
      </div>

      {/* Subscriptions Section */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '15px', margin: 0 }}>Subscriptions ({subscriptions.length})</h2>
            <p style={{ margin: '3px 0 0', color: '#687365', fontSize: '12px' }}>Contracts and recurring billing schedules</p>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <EmptyState title="No subscriptions" description="This customer does not have any active or previous subscriptions." />
        ) : (
          <div className="feature-invoice-list">
            {subscriptions.map((sub) => (
              <article className="feature-invoice-row" key={sub.id}>
                <div>
                  <strong>{sub.plan?.name || sub.subscription_number || 'Subscription'}</strong>
                  <small>
                    Started: {sub.start_date} · Next Billing: {sub.next_billing_date || 'N/A'} · Every {sub.interval_count || 1} {sub.billing_interval}
                  </small>
                </div>
                <div className="feature-invoice-amount">
                  <span>{sub.currency || 'INR'} {sub.subscription_number}</span>
                  <StatusBadge>{sub.status}</StatusBadge>
                </div>
                <Link className="arrow-link" to={`/admin/subscriptions/${encodeURIComponent(sub.id)}`}>
                  View
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '15px', margin: 0 }}>Invoices ({invoices.length})</h2>
            <p style={{ margin: '3px 0 0', color: '#687365', fontSize: '12px' }}>Billing statements and collection history</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <EmptyState title="No invoices" description="No invoices have been generated for this customer yet." />
        ) : (
          <div className="feature-invoice-list">
            {invoices.map((inv) => (
              <article className="feature-invoice-row" key={inv.id}>
                <div>
                  <strong>#{inv.invoice_number}</strong>
                  <small>
                    Issued {inv.issue_date} · Due {inv.due_date} · Paid: ₹{Number(inv.amount_paid || 0).toLocaleString()}
                  </small>
                </div>
                <div className="feature-invoice-amount">
                  <span>₹{Number(inv.total_amount).toLocaleString()}</span>
                  <StatusBadge>{inv.status}</StatusBadge>
                </div>
                <Link className="arrow-link" to={`/admin/invoices/${encodeURIComponent(inv.id)}`}>
                  View
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {editing && (
        <Modal title="Edit Customer Profile" onClose={() => setEditing(false)}>
          <form className="modal-form" onSubmit={handleUpdate}>
            <label>
              Company / Customer name
              <input name="name" required defaultValue={customer.name} />
            </label>
            <label>
              Contact email
              <input name="email" required type="email" defaultValue={customer.email} />
            </label>
            <label>
              Phone number
              <input name="phone" defaultValue={customer.phone || ''} placeholder="+91 98765 43210" />
            </label>
            <label>
              Billing address / Region
              <input name="billing_address" defaultValue={customer.billing_address || ''} placeholder="Address, City, State" />
            </label>
            <div className="feature-form-actions">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}

