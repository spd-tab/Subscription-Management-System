import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Edit2,
  Power,
  Trash2,
  Package,
  Layers,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import {
  Button,
  PrimaryButton,
  SecondaryButton,
  DataTable,
  Modal,
  StatusBadge,
  FormInput,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmationDialog,
} from '../components/common/UI'
import { supabase } from '../services/supabase/client'
import {
  fetchProductById,
  updateProduct,
  toggleProductStatus,
  createVariant,
  updateVariant,
  toggleVariantStatus,
  deleteVariant,
} from '../services/productsService'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)

  // Edit Product Modal
  const [isEditProductOpen, setIsEditProductOpen] = useState(false)
  const [productFormData, setProductFormData] = useState({
    name: '',
    type: 'Software',
    sales_price: '',
    cost_price: '',
    notes: '',
    is_active: true,
  })

  // Variant Modal
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [variantFormData, setVariantFormData] = useState({
    name: '',
    price_modifier: '',
    is_active: true,
  })

  // Confirmation dialog for deleting variant
  const [deletingVariantItem, setDeletingVariantItem] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Load product
  const loadProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchProductById(id)
      setProduct(data)
    } catch (err) {
      console.error('Failed to load product details:', err)
      setError(err.message || 'Could not find product.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadProduct()
  }, [id])

  // Toast timer
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Open Edit Product Modal
  const handleOpenEditProduct = () => {
    if (!product) return
    setProductFormData({
      name: product.name,
      type: product.type || 'Software',
      sales_price: product.sales_price,
      cost_price: product.cost_price || 0,
      notes: product.notes || '',
      is_active: Boolean(product.is_active),
    })
    setFormError(null)
    setIsEditProductOpen(true)
  }

  // Submit Product Edit
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setFormError('Authentication required: You must be logged in as an Admin to update products. Please sign in at /login.')
        setSubmitting(false)
        return
      }

      const updated = await updateProduct(product.id, {
        name: productFormData.name,
        type: productFormData.type,
        sales_price: parseFloat(productFormData.sales_price) || 0,
        cost_price: parseFloat(productFormData.cost_price) || 0,
        notes: productFormData.notes,
        is_active: productFormData.is_active,
      })
      setProduct(updated)
      setIsEditProductOpen(false)
      setSuccessToast('Product details updated successfully.')
    } catch (err) {
      if (err.code === '42501' || err.message?.includes('row-level security')) {
        setFormError('Permission Denied (RLS): Your account lacks Admin or Staff permissions to modify products.')
      } else {
        setFormError(err.message || 'Failed to update product.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle Product Status
  const handleToggleProductStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Authentication required: Please sign in with an Admin account to change product status.')
        return
      }

      const updated = await toggleProductStatus(product.id, product.is_active)
      setProduct((prev) => ({ ...prev, is_active: updated.is_active }))
      setSuccessToast(`Product is now ${updated.is_active ? 'Active' : 'Inactive'}.`)
    } catch (err) {
      if (err.code === '42501' || err.message?.includes('row-level security')) {
        alert('Permission Denied (RLS): Your account lacks permissions to change product status.')
      } else {
        alert(`Could not toggle product: ${err.message}`)
      }
    }
  }

  // Open Add Variant
  const handleOpenAddVariant = () => {
    setEditingVariant(null)
    setVariantFormData({
      name: '',
      price_modifier: '0.00',
      is_active: true,
    })
    setFormError(null)
    setIsVariantModalOpen(true)
  }

  // Open Edit Variant
  const handleOpenEditVariant = (variant) => {
    setEditingVariant(variant)
    setVariantFormData({
      name: variant.name,
      price_modifier: variant.price_modifier ?? '0.00',
      is_active: Boolean(variant.is_active),
    })
    setFormError(null)
    setIsVariantModalOpen(true)
  }

  // Save Variant (Create or Edit)
  const handleSaveVariant = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    if (!variantFormData.name.trim()) {
      setFormError('Variant name is required.')
      setSubmitting(false)
      return
    }

    const priceMod = parseFloat(variantFormData.price_modifier)
    if (isNaN(priceMod)) {
      setFormError('Price modifier must be a valid number.')
      setSubmitting(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setFormError('Authentication required: You must be logged in as an Admin to configure variants. Please sign in at /login.')
        setSubmitting(false)
        return
      }

      if (editingVariant) {
        const updated = await updateVariant(editingVariant.id, {
          name: variantFormData.name,
          price_modifier: priceMod,
          is_active: variantFormData.is_active,
        })
        setProduct((prev) => ({
          ...prev,
          product_variants: prev.product_variants.map((v) =>
            v.id === updated.id ? updated : v
          ),
        }))
        setSuccessToast(`Variant "${updated.name}" updated.`)
      } else {
        const created = await createVariant({
          product_id: product.id,
          name: variantFormData.name,
          price_modifier: priceMod,
          is_active: variantFormData.is_active,
        })
        setProduct((prev) => ({
          ...prev,
          product_variants: [...(prev.product_variants || []), created],
        }))
        setSuccessToast(`Variant "${created.name}" created.`)
      }

      setIsVariantModalOpen(false)
    } catch (err) {
      if (err.code === '42501' || err.message?.includes('row-level security')) {
        setFormError('Permission Denied (RLS): Your account lacks Admin or Staff permissions to modify variants.')
      } else {
        setFormError(err.message || 'Variant operation failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle Variant Status
  const handleToggleVariant = async (variant) => {
    try {
      const updated = await toggleVariantStatus(variant.id, variant.is_active)
      setProduct((prev) => ({
        ...prev,
        product_variants: prev.product_variants.map((v) =>
          v.id === updated.id ? updated : v
        ),
      }))
      setSuccessToast(`Variant "${variant.name}" is now ${updated.is_active ? 'Active' : 'Inactive'}.`)
    } catch (err) {
      alert(`Could not toggle variant: ${err.message}`)
    }
  }

  // Delete Variant
  const handleDeleteVariantConfirm = async () => {
    if (!deletingVariantItem) return
    try {
      await deleteVariant(deletingVariantItem.id)
      setProduct((prev) => ({
        ...prev,
        product_variants: prev.product_variants.filter((v) => v.id !== deletingVariantItem.id),
      }))
      setSuccessToast(`Variant "${deletingVariantItem.name}" deleted.`)
      setDeletingVariantItem(null)
    } catch (err) {
      alert(`Could not delete variant: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 0' }}>
        <LoadingState label="Loading product specifications..." />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div style={{ padding: '20px 0' }}>
        <ErrorState message={error || 'Product not found.'} />
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button onClick={() => navigate('/admin/products')}>Back to Products</Button>
        </div>
      </div>
    )
  }

  const margin = product.sales_price - (product.cost_price || 0)
  const marginPercent =
    product.sales_price > 0 ? Math.round((margin / product.sales_price) * 100) : 0

  const variants = product.product_variants || []

  const variantColumns = ['Variant Name', 'Price Modifier', 'Effective Price', 'Status']
  const variantRows = variants.map((v) => {
    const effectivePrice = Number(product.sales_price) + Number(v.price_modifier || 0)
    const modifierSign = v.price_modifier > 0 ? `+₹${Number(v.price_modifier).toFixed(2)}` : v.price_modifier < 0 ? `-₹${Math.abs(v.price_modifier).toFixed(2)}` : '₹0.00'

    return {
      id: v.id,
      variant: v,
      cells: [
        v.name,
        modifierSign,
        `₹${effectivePrice.toFixed(2)}`,
        v.is_active ? 'Active' : 'Inactive',
      ],
    }
  })

  return (
    <>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/admin/dashboard">Workspace</Link>
        <span>/</span>
        <Link to="/admin/products">Products</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      {/* Page Heading */}
      <div className="page-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/admin/products" className="icon-button" title="Back to Products">
            <ArrowLeft size={19} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0 }}>{product.name}</h1>
              <StatusBadge>{product.is_active ? 'Active' : 'Inactive'}</StatusBadge>
            </div>
            <p style={{ margin: '4px 0 0' }}>
              Category: <strong>{product.type || 'Standard'}</strong> • Created{' '}
              {new Date(product.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="heading-actions">
          <Button variant="secondary" onClick={loadProduct} title="Refresh data">
            <RefreshCw size={16} />
          </Button>
          <Button variant="secondary" onClick={handleToggleProductStatus}>
            <Power size={16} /> {product.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <PrimaryButton onClick={handleOpenEditProduct}>
            <Edit2 size={16} /> Edit Product
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

      {/* Product Financial Summary Panel */}
      <section className="panel" style={{ marginBottom: '20px' }}>
        <div className="panel-heading">
          <div>
            <h2>Product Financials & Scope</h2>
            <p>Pricing configuration stored in Supabase</p>
          </div>
          <span className="growth-tag">Margin: {marginPercent}%</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
            margin: '16px 0',
          }}
        >
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: '#eff5ec',
              border: '1px solid #dce5d9',
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#566453', fontWeight: 600 }}>
              Base Sales Price
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#131e13' }}>
              ₹{Number(product.sales_price).toFixed(2)}
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: '#eff5ec',
              border: '1px solid #dce5d9',
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#566453', fontWeight: 600 }}>
              Estimated Unit Cost
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#131e13' }}>
              ₹{Number(product.cost_price || 0).toFixed(2)}
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: '#eff5ec',
              border: '1px solid #dce5d9',
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#566453', fontWeight: 600 }}>
              Gross Profit Margin
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: margin >= 0 ? '#255e24' : '#9b1c1c' }}>
              {margin >= 0 ? `+₹${margin.toFixed(2)}` : `-₹${Math.abs(margin).toFixed(2)}`}
            </div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: '#eff5ec',
              border: '1px solid #dce5d9',
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#566453', fontWeight: 600 }}>
              Variants Count
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#131e13' }}>
              {variants.length}
            </div>
          </div>
        </div>

        {product.notes && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f9fbf8',
              border: '1px solid #e7eee5',
              fontSize: '13px',
              color: '#495447',
            }}
          >
            <strong>Internal Description / Notes:</strong> {product.notes}
          </div>
        )}
      </section>

      {/* Product Variants Section */}
      <section className="panel module-table-panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Product Variants</h2>
            <p style={{ margin: '4px 0 0', color: '#667364', fontSize: '13px' }}>
              Configure add-on tiers, licensing levels, and price modifiers
            </p>
          </div>
          <PrimaryButton onClick={handleOpenAddVariant}>
            <Plus size={17} /> Add Variant
          </PrimaryButton>
        </div>

        {variants.length === 0 ? (
          <EmptyState
            title="No variants configured"
            description="Variants let you offer different pricing tiers, license packs, or options for this product."
          />
        ) : (
          <DataTable
            columns={variantColumns}
            rows={variantRows.map((r) => r.cells)}
            renderCell={(cell, row, cellIndex) => {
              if (cellIndex === variantColumns.length - 1) {
                return <StatusBadge>{cell}</StatusBadge>
              }
              if (cellIndex === 0) {
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <Layers size={16} style={{ color: '#586755' }} />
                    <span>{cell}</span>
                  </div>
                )
              }
              if (cellIndex === 1) {
                return <strong style={{ color: '#415240' }}>{cell}</strong>
              }
              if (cellIndex === 2) {
                return <strong style={{ color: '#1a2919' }}>{cell}</strong>
              }
              return cell
            }}
            renderActions={(_row, rowIndex) => {
              const item = variantRows[rowIndex].variant
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="icon-button"
                    style={{ width: '30px', height: '30px' }}
                    title="Edit variant"
                    onClick={() => handleOpenEditVariant(item)}
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
                    title={item.is_active ? 'Deactivate variant' : 'Activate variant'}
                    onClick={() => handleToggleVariant(item)}
                  >
                    <Power size={14} />
                  </button>
                  <button
                    className="icon-button"
                    style={{ width: '30px', height: '30px', color: '#9b1c1c' }}
                    title="Delete variant"
                    onClick={() => setDeletingVariantItem(item)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            }}
          />
        )}
      </section>

      {/* Edit Product Modal */}
      {isEditProductOpen && (
        <Modal title="Edit Product" onClose={() => setIsEditProductOpen(false)}>
          <form className="modal-form" onSubmit={handleSaveProduct}>
            {formError && (
              <div className="error-state" style={{ padding: '8px', fontSize: '12px' }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <FormInput
              id="edit-prod-name"
              label="Product Name *"
              required
              value={productFormData.name}
              onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
            />

            <FormInput
              id="edit-prod-type"
              label="Type / Category"
              value={productFormData.type}
              onChange={(e) => setProductFormData({ ...productFormData, type: e.target.value })}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormInput
                id="edit-prod-sales-price"
                label="Sales Price (₹) *"
                type="number"
                step="0.01"
                min="0"
                required
                value={productFormData.sales_price}
                onChange={(e) =>
                  setProductFormData({ ...productFormData, sales_price: e.target.value })
                }
              />

              <FormInput
                id="edit-prod-cost-price"
                label="Cost Price (₹)"
                type="number"
                step="0.01"
                min="0"
                value={productFormData.cost_price}
                onChange={(e) =>
                  setProductFormData({ ...productFormData, cost_price: e.target.value })
                }
              />
            </div>

            <label className="form-field" htmlFor="edit-prod-notes">
              Notes
              <textarea
                id="edit-prod-notes"
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 11px',
                  border: '1px solid #dce3da',
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                }}
                value={productFormData.notes}
                onChange={(e) => setProductFormData({ ...productFormData, notes: e.target.value })}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={productFormData.is_active}
                onChange={(e) =>
                  setProductFormData({ ...productFormData, is_active: e.target.checked })
                }
              />
              <span>Product is active</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <SecondaryButton type="button" onClick={() => setIsEditProductOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Add or Edit Variant Modal */}
      {isVariantModalOpen && (
        <Modal
          title={editingVariant ? 'Edit Variant' : 'Add Product Variant'}
          onClose={() => setIsVariantModalOpen(false)}
        >
          <form className="modal-form" onSubmit={handleSaveVariant}>
            {formError && (
              <div className="error-state" style={{ padding: '8px', fontSize: '12px' }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <FormInput
              id="variant-name"
              label="Variant Name *"
              required
              placeholder="e.g. Annual Billing Tier, 10-Seat Pack, Premium Support"
              value={variantFormData.name}
              onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
            />

            <FormInput
              id="variant-price-modifier"
              label="Price Modifier (₹) *"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={variantFormData.price_modifier}
              onChange={(e) =>
                setVariantFormData({ ...variantFormData, price_modifier: e.target.value })
              }
            />
            <small style={{ color: '#687566', fontSize: '11px', marginTop: '-6px' }}>
              Additional price on top of base sales price (₹{Number(product.sales_price).toFixed(2)}).
              Effective total: ₹
              {(
                Number(product.sales_price) + (parseFloat(variantFormData.price_modifier) || 0)
              ).toFixed(2)}
            </small>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '6px' }}>
              <input
                type="checkbox"
                checked={variantFormData.is_active}
                onChange={(e) =>
                  setVariantFormData({ ...variantFormData, is_active: e.target.checked })
                }
              />
              <span>Variant is active</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <SecondaryButton type="button" onClick={() => setIsVariantModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingVariant ? 'Update Variant' : 'Create Variant'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog for Variant Deletion */}
      {deletingVariantItem && (
        <ConfirmationDialog
          title="Delete Variant"
          message={`Are you sure you want to delete the variant "${deletingVariantItem.name}"? This action cannot be undone.`}
          confirmLabel="Delete Variant"
          onConfirm={handleDeleteVariantConfirm}
          onClose={() => setDeletingVariantItem(null)}
        />
      )}
    </>
  )
}
