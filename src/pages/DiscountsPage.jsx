import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Tag, Percent, DollarSign, Copy, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, MetricCard, SearchBar, FilterDropdown, StatusBadge, Modal } from '../components/common/UI'
import { fetchDiscounts, createDiscount, updateDiscount, deleteDiscount } from '../services/supabase/queries'
import { useAuth } from '../context/AuthContext'

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isAdmin } = useAuth()

  const loadDiscounts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchDiscounts({ search, status: statusFilter })
    if (!error && data) {
      setDiscounts(data)
    }
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { loadDiscounts() }, [loadDiscounts])

  const activeCount = discounts.filter((d) => d.status === 'active').length
  const totalRedemptions = discounts.reduce((sum, d) => sum + (d.current_uses || 0), 0)
  const scheduledCount = discounts.filter((d) => d.status === 'scheduled').length

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = e.target
    const discountData = {
      code: form.code.value.toUpperCase().replace(/\s+/g, ''),
      description: form.description.value,
      type: form.type.value,
      value: parseFloat(form.discountValue.value),
      min_order_amount: form.minOrder.value ? parseFloat(form.minOrder.value) : 0,
      max_uses: form.maxUses.value ? parseInt(form.maxUses.value) : null,
      start_date: form.startDate.value || null,
      end_date: form.endDate.value || null,
      status: form.status.value,
    }

    if (editingDiscount) {
      const { error } = await updateDiscount(editingDiscount.id, discountData)
      if (!error) {
        setShowForm(false)
        setEditingDiscount(null)
        loadDiscounts()
      }
    } else {
      const { error } = await createDiscount(discountData)
      if (!error) {
        setShowForm(false)
        loadDiscounts()
      }
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return
    const { error } = await deleteDiscount(id)
    if (!error) loadDiscounts()
  }

  const handleEdit = (discount) => {
    setEditingDiscount(discount)
    setShowForm(true)
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <>
      <div className="breadcrumbs">
        <Link to="/admin/dashboard">Workspace</Link>
        <span>/</span>
        Discounts
      </div>

      <div className="page-heading">
        <div>
          <h1>Discounts</h1>
          <p>Manage promotional codes and customer offers</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingDiscount(null); setShowForm(true) }}>
            <Plus size={18} /> Create Discount
          </Button>
        )}
      </div>

      <div className="module-metrics">
        <MetricCard label="Active Discounts" value={activeCount} delta="Currently available" />
        <MetricCard label="Total Redemptions" value={totalRedemptions.toLocaleString()} delta="All time usage" />
        <MetricCard label="Scheduled" value={scheduledCount} delta="Upcoming promotions" />
      </div>

      <section className="panel discount-panel">
        <div className="module-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by code or description…"
          />
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All discounts' },
              { value: 'active', label: 'Active' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'expired', label: 'Expired' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>

        <div className="discount-grid">
          {loading && <div className="state-message">Loading discounts…</div>}
          {!loading && discounts.length === 0 && (
            <div className="empty-state">No discounts found matching your criteria.</div>
          )}
          {!loading && discounts.map((discount) => (
            <article className="discount-card" key={discount.id}>
              <div className="discount-card-header">
                <div className="discount-icon-wrap">
                  {discount.type === 'percentage'
                    ? <Percent size={20} />
                    : <DollarSign size={20} />}
                </div>
                <div className="discount-info">
                  <div className="discount-code-row">
                    <code className="discount-code">{discount.code}</code>
                    <button
                      className="icon-button copy-btn"
                      onClick={() => handleCopyCode(discount.code)}
                      aria-label="Copy code"
                      title="Copy code"
                    >
                      {copiedCode === discount.code ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <span className="discount-desc">{discount.description}</span>
                </div>
                <StatusBadge>{discount.status}</StatusBadge>
              </div>

              <div className="discount-card-body">
                <div className="discount-value-display">
                  <strong>
                    {discount.type === 'percentage'
                      ? `${discount.value}% off`
                      : `$${discount.value.toLocaleString()} off`}
                  </strong>
                  {discount.min_order_amount > 0 && (
                    <small>Min order: ${discount.min_order_amount.toLocaleString()}</small>
                  )}
                </div>

                <div className="discount-stats">
                  <div className="discount-stat">
                    <small>Uses</small>
                    <span>{discount.current_uses || 0}{discount.max_uses ? ` / ${discount.max_uses}` : ' / ∞'}</span>
                  </div>
                  <div className="discount-stat">
                    <small>Valid</small>
                    <span>
                      {discount.start_date
                        ? new Date(discount.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Always'}
                      {discount.end_date && ` – ${new Date(discount.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </span>
                  </div>
                </div>

                {discount.max_uses && (
                  <div className="discount-usage-bar">
                    <div
                      className="discount-usage-fill"
                      style={{ width: `${Math.min(100, ((discount.current_uses || 0) / discount.max_uses) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="discount-card-actions">
                  <Button variant="secondary" onClick={() => handleEdit(discount)}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button variant="secondary" className="danger-button" onClick={() => handleDelete(discount.id)}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {showForm && (
        <Modal
          title={editingDiscount ? 'Edit Discount' : 'Create Discount'}
          onClose={() => { setShowForm(false); setEditingDiscount(null) }}
        >
          <form className="modal-form" onSubmit={handleSubmit}>
            <label>
              Discount code
              <input
                name="code"
                required
                placeholder="e.g. SUMMER25"
                defaultValue={editingDiscount?.code || ''}
                style={{ textTransform: 'uppercase' }}
              />
            </label>

            <label>
              Description
              <input
                name="description"
                required
                placeholder="Brief description of the offer"
                defaultValue={editingDiscount?.description || ''}
              />
            </label>

            <div className="form-row">
              <label>
                Type
                <select name="type" defaultValue={editingDiscount?.type || 'percentage'}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>

              <label>
                Value
                <input
                  name="discountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0"
                  defaultValue={editingDiscount?.value || ''}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Min order amount
                <input
                  name="minOrder"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00 (no minimum)"
                  defaultValue={editingDiscount?.min_order_amount || ''}
                />
              </label>

              <label>
                Max uses
                <input
                  name="maxUses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  defaultValue={editingDiscount?.max_uses || ''}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Start date
                <input
                  name="startDate"
                  type="date"
                  defaultValue={editingDiscount?.start_date?.slice(0, 10) || ''}
                />
              </label>

              <label>
                End date
                <input
                  name="endDate"
                  type="date"
                  defaultValue={editingDiscount?.end_date?.slice(0, 10) || ''}
                />
              </label>
            </div>

            <label>
              Status
              <select name="status" defaultValue={editingDiscount?.status || 'active'}>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <Button type="submit">
              {editingDiscount ? 'Update Discount' : 'Create Discount'}
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}
