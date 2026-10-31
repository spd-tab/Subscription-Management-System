import { useState, useEffect } from 'react'
import { Plus, Edit2, Power, Eye, Package, Check, AlertCircle, RefreshCw, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Button,
  PrimaryButton,
  SecondaryButton,
  DataTable,
  FilterDropdown,
  MetricCard,
  Modal,
  Pagination,
  SearchBar,
  StatusBadge,
  FormInput,
  SelectInput,
  LoadingState,
  ErrorState,
  EmptyState,
} from '../components/common/UI'
import { supabase } from '../services/supabase/client'
import {
  fetchProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
} from '../services/productsService'

const PRODUCT_TYPES = [
  { value: 'Software', label: 'Software' },
  { value: 'Subscription', label: 'Subscription' },
  { value: 'Service', label: 'Service' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Add-on', label: 'Add-on' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 8

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    type: 'Software',
    sales_price: '',
    cost_price: '',
    notes: '',
    is_active: true,
  })

  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)

  // Load products from Supabase
  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchProducts()
      setProducts(data)
    } catch (err) {
      console.error('Failed to load products:', err)
      setError(err.message || 'Could not load products from Supabase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()

    if (supabase) {
      const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUser(session.user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          setUserRole(profile?.role || session.user.user_metadata?.role || 'staff')
        } else {
          setCurrentUser(null)
          setUserRole(null)
        }
      }
      checkUser()

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setCurrentUser(session.user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          setUserRole(profile?.role || session.user.user_metadata?.role || 'staff')
        } else {
          setCurrentUser(null)
          setUserRole(null)
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  // Auto-dismiss success toast after 3.5s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      type: 'Software',
      sales_price: '',
      cost_price: '',
      notes: '',
      is_active: true,
    })
    setFormError(null)
    setIsAddModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || '',
      type: product.type || 'Software',
      sales_price: product.sales_price ?? '',
      cost_price: product.cost_price ?? '',
      notes: product.notes || '',
      is_active: Boolean(product.is_active),
    })
    setFormError(null)
  }

  // Close Modals
  const handleCloseModal = () => {
    setIsAddModalOpen(false)
    setEditingProduct(null)
    setFormError(null)
  }

  // Form submit handler (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError(null)

    // Check authentication
    if (!currentUser) {
      setFormError(
        'Authentication required: You are currently browsing as a guest. Please sign in with your Admin account at /login to save products.'
      )
      setFormSubmitting(false)
      return
    }

    // Validation
    if (!formData.name.trim()) {
      setFormError('Product name is required.')
      setFormSubmitting(false)
      return
    }

    const salesPrice = parseFloat(formData.sales_price)
    if (isNaN(salesPrice) || salesPrice < 0) {
      setFormError('Sales price must be a valid number >= 0.')
      setFormSubmitting(false)
      return
    }

    const costPrice = formData.cost_price ? parseFloat(formData.cost_price) : 0
    if (isNaN(costPrice) || costPrice < 0) {
      setFormError('Cost price must be a valid number >= 0.')
      setFormSubmitting(false)
      return
    }

    try {
      if (editingProduct) {
        // Update existing
        const updated = await updateProduct(editingProduct.id, {
          name: formData.name,
          type: formData.type,
          sales_price: salesPrice,
          cost_price: costPrice,
          notes: formData.notes,
          is_active: formData.is_active,
        })
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        setSuccessToast(`Product "${updated.name}" updated successfully.`)
      } else {
        // Create new
        const created = await createProduct({
          name: formData.name,
          type: formData.type,
          sales_price: salesPrice,
          cost_price: costPrice,
          notes: formData.notes,
          is_active: formData.is_active,
        })
        setProducts((prev) => [created, ...prev])
        setSuccessToast(`Product "${created.name}" created successfully.`)
      }

      handleCloseModal()
    } catch (err) {
      console.error('Form submit error:', err)
      if (err.code === '42501' || err.message?.includes('row-level security')) {
        setFormError(
          'Permission Denied (RLS): Your current session does not have Admin or Staff permissions to modify products. Please sign in with an authorized account.'
        )
      } else {
        setFormError(err.message || 'Operation failed. Please try again.')
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  // Quick toggle active / inactive
  const handleToggleStatus = async (product) => {
    if (!currentUser) {
      alert('Authentication required: Please sign in with an Admin account to modify product status.')
      return
    }
    try {
      const updated = await toggleProductStatus(product.id, product.is_active)
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setSuccessToast(`Product marked as ${updated.is_active ? 'Active' : 'Inactive'}.`)
    } catch (err) {
      console.error('Status toggle error:', err)
      if (err.code === '42501' || err.message?.includes('row-level security')) {
        alert('Permission Denied (RLS): Your account lacks admin permissions to change product status.')
      } else {
        alert(`Could not change status: ${err.message}`)
      }
    }
  }

  // Filter & Search logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.type?.toLowerCase().includes(search.toLowerCase()) ||
      p.notes?.toLowerCase().includes(search.toLowerCase())

    const matchesType = typeFilter === 'all' || p.type?.toLowerCase() === typeFilter.toLowerCase()

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active)

    return matchesSearch && matchesType && matchesStatus
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const pagedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize)

  // Metrics calculation
  const totalProductsCount = products.length
  const activeProductsCount = products.filter((p) => p.is_active).length
  const totalVariantsCount = products.reduce(
    (sum, p) => sum + (p.product_variants?.length || 0),
    0
  )

  // Table rows structure: [name, type, sales_price, cost_price, variants, status]
  const tableColumns = ['Product', 'Type', 'Sales Price', 'Cost Price', 'Margin', 'Variants', 'Status']

  const tableRows = pagedProducts.map((p) => {
    const margin = p.sales_price - (p.cost_price || 0)
    const marginPercent = p.sales_price > 0 ? Math.round((margin / p.sales_price) * 100) : 0
    const variantCount = p.product_variants?.length || 0

    return {
      id: p.id,
      product: p,
      cells: [
        p.name,
        p.type || 'Standard',
        `₹${Number(p.sales_price).toFixed(2)}`,
        `₹${Number(p.cost_price || 0).toFixed(2)}`,
        `₹${margin.toFixed(2)} (${marginPercent}%)`,
        `${variantCount} ${variantCount === 1 ? 'variant' : 'variants'}`,
        p.is_active ? 'Active' : 'Inactive',
      ],
    }
  })

  return (
    <>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/admin/dashboard">Workspace</Link>
        <span>/</span>
        <span>Products</span>
      </div>

      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Products Catalog</h1>
          <p>Create and manage products, sales pricing, and variant structures in Supabase</p>
        </div>
        <div className="heading-actions">
          <Button variant="secondary" onClick={loadProducts} title="Refresh data">
            <RefreshCw size={16} className={loading ? 'loading-icon' : ''} /> Refresh
          </Button>
          <PrimaryButton onClick={handleOpenAddModal}>
            <Plus size={18} /> Add Product
          </PrimaryButton>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div
          style={{
            background: '#eaf4e7',
            border: '1px solid #c2dec0',
            color: '#284f27',
            padding: '10px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <Check size={18} /> {successToast}
        </div>
      )}

      {/* Guest Mode Notice */}
      {!currentUser && (
        <div
          style={{
            background: '#fff9e6',
            border: '1px solid #f6df9b',
            color: '#7e5300',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} style={{ color: '#b27b00', flexShrink: 0 }} />
            <span>
              <strong>Browsing as guest:</strong> You are currently unauthenticated. To add or modify products, please sign in with an Admin account.
            </span>
          </div>
          <Link
            to="/login"
            style={{
              padding: '6px 14px',
              background: '#0e1b0e',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            Sign in &rarr;
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="module-metrics">
        <MetricCard
          label="Total Products"
          value={loading ? '...' : String(totalProductsCount)}
          delta={`${activeProductsCount} active`}
        />
        <MetricCard
          label="Active In Catalog"
          value={loading ? '...' : String(activeProductsCount)}
          delta={`${totalProductsCount - activeProductsCount} inactive`}
        />
        <MetricCard
          label="Configured Variants"
          value={loading ? '...' : String(totalVariantsCount)}
          delta="Across catalog"
        />
      </div>

      {/* Main Panel */}
      <section className="panel module-table-panel">
        {/* Toolbar: Search & Filters */}
        <div className="module-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            placeholder="Search products by name, type, or notes..."
          />
          <FilterDropdown
            value={typeFilter}
            onChange={(val) => {
              setTypeFilter(val)
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'software', label: 'Software' },
              { value: 'subscription', label: 'Subscription' },
              { value: 'service', label: 'Service' },
              { value: 'hardware', label: 'Hardware' },
              { value: 'add-on', label: 'Add-on' },
            ]}
            label="Filter by type"
          />
          <FilterDropdown
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val)
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active only' },
              { value: 'inactive', label: 'Inactive only' },
            ]}
            label="Filter by status"
          />
        </div>

        {/* Loading / Error / Table */}
        {loading ? (
          <LoadingState label="Fetching products from Supabase..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="No products found"
            description={
              search || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'Get started by creating your first product using the "Add Product" button above.'
            }
          />
        ) : (
          <>
            <DataTable
              columns={tableColumns}
              rows={tableRows.map((r) => r.cells)}
              renderCell={(cell, row, cellIndex) => {
                // Style Status badge
                if (cellIndex === tableColumns.length - 1) {
                  return <StatusBadge>{cell}</StatusBadge>
                }
                // Product Name column with icon
                if (cellIndex === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <Package size={17} style={{ color: '#586755' }} />
                      <span>{cell}</span>
                    </div>
                  )
                }
                // Variants column
                if (cellIndex === 5) {
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={14} style={{ color: '#7a8977' }} />
                      {cell}
                    </span>
                  )
                }
                return cell
              }}
              renderActions={(_row, rowIndex) => {
                const item = tableRows[rowIndex].product
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      to={`/admin/products/${item.id}`}
                      className="table-link"
                      title="View details & variants"
                    >
                      <Eye size={15} /> Details
                    </Link>
                    <button
                      className="icon-button"
                      style={{ width: '30px', height: '30px' }}
                      title="Edit product"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="icon-button"
                      style={{
                        width: '30px',
                        height: '30px',
                        color: item.is_active ? '#347a32' : '#992d2d',
                      }}
                      title={item.is_active ? 'Deactivate product' : 'Activate product'}
                      onClick={() => handleToggleStatus(item)}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                )
              }}
              emptyText="No matching products found."
            />

            {/* Pagination */}
            <Pagination page={page} pages={totalPages} onChange={setPage} />
          </>
        )}
      </section>

      {/* Add or Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <Modal
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          onClose={handleCloseModal}
        >
          <form className="modal-form" onSubmit={handleSubmit}>
            {formError && (
              <div
                style={{
                  background: '#fde8e8',
                  border: '1px solid #f8b4b4',
                  color: '#9b1c1c',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <FormInput
              id="product-name"
              label="Product Name *"
              required
              placeholder="e.g. Brightloop Analytics Suite"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <SelectInput
              id="product-type"
              label="Product Type *"
              options={PRODUCT_TYPES}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormInput
                id="product-sales-price"
                label="Sales Price (₹) *"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formData.sales_price}
                onChange={(e) => setFormData({ ...formData, sales_price: e.target.value })}
              />

              <FormInput
                id="product-cost-price"
                label="Cost Price (₹)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              />
            </div>

            <label className="form-field" htmlFor="product-notes">
              Internal Notes
              <textarea
                id="product-notes"
                rows={3}
                placeholder="Optional billing details, license scope, or description..."
                style={{
                  width: '100%',
                  padding: '8px 11px',
                  border: '1px solid #dce3da',
                  borderRadius: '8px',
                  background: '#fff',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Product is active (available for plans & quotations)</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <SecondaryButton type="button" onClick={handleCloseModal} disabled={formSubmitting}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
