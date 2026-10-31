import { useMemo, useState } from 'react'
import { Button, DatePicker, FormInput, SelectInput } from '../../../components/common/UI'
import { calculateDiscountAmount, calculateInvoiceItemTotals, calculateInvoiceLinesSubtotal, getLocalDateOnly } from '../services/calculationUtils'
import { validateInvoiceDraft } from '../services/invoiceValidation'
import InvoiceItemsTable from './InvoiceItemsTable'

export default function InvoiceForm({ customers, taxRates = [], onSubmit, onCancel, submitting = false, isDemo = false }) {
  const [customerId, setCustomerId] = useState('')
  const [dueAt, setDueAt] = useState(getLocalDateOnly())
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }])
  const [discountType, setDiscountType] = useState('fixed')
  const [discountValue, setDiscountValue] = useState('')
  const [taxRateId, setTaxRateId] = useState('')
  const [formError, setFormError] = useState('')
  const currency = isDemo ? 'USD' : 'INR'
  const selectedTaxRate = taxRates.find((rate) => rate.id === taxRateId)
  const taxRatePercent = selectedTaxRate?.ratePercent ?? 0
  const subtotal = useMemo(() => {
    try {
      return calculateInvoiceLinesSubtotal(items)
    } catch {
      return null
    }
  }, [items])
  const totals = useMemo(() => {
    if (subtotal === null) return null
    try {
      const discountAmount = calculateDiscountAmount(subtotal, { type: discountType, value: discountValue || 0 })
      return calculateInvoiceItemTotals(items, discountAmount, taxRatePercent || 0)
    } catch {
      return null
    }
  }, [subtotal, discountType, discountValue, taxRatePercent])

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateInvoiceDraft({ customerId, items, discountType, discountValue, taxRatePercent, subtotal, dueAt })
    if (validationError) {
      setFormError(validationError)
      return
    }
    if (!totals) {
      setFormError('Discount or tax input is outside the supported range.')
      return
    }
    const customer = customers.find((item) => item.id === customerId)
    try {
      await onSubmit({
        customerId,
        customerName: customer?.name,
        currency,
        dueAt: dueAt || null,
        taxRateId: taxRateId || null,
        discountType,
        discountValue: Number(discountValue || 0),
        items: items.map((item) => ({ ...item, description: item.description.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
        ...totals,
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create invoice draft.')
    }
  }

  return <form className="modal-form feature-form" onSubmit={handleSubmit} noValidate>
    <SelectInput id="invoice-customer" label="Customer" required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setFormError('') }} options={[{ value: '', label: 'Select a customer' }, ...customers.map((customer) => ({ value: customer.id, label: customer.name }))]} />
    <DatePicker id="invoice-due-date" label="Due date" required value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
    <InvoiceItemsTable items={items} onChange={setItems} />
    <div className="feature-form-grid">
      <SelectInput id="invoice-discount-type" label="Discount type" value={discountType} onChange={(event) => setDiscountType(event.target.value)} options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'percentage', label: 'Percentage' }]} />
      <FormInput id="invoice-discount" label={discountType === 'fixed' ? `Fixed discount (${currency})` : 'Discount percentage (%)'} type="number" min="0" max={discountType === 'percentage' ? '100' : undefined} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
      <SelectInput id="invoice-tax-rate" label="Configured tax rate" value={taxRateId} onChange={(event) => setTaxRateId(event.target.value)} options={[{ value: '', label: 'No tax' }, ...taxRates.map((rate) => ({ value: rate.id, label: `${rate.name} (${rate.ratePercent}%)` }))]} />
    </div>
    <div className="feature-summary"><span>Subtotal <strong>{currency} {totals?.subtotal.toFixed(2) ?? '—'}</strong></span><span>Discount <strong>− {currency} {totals?.discountAmount.toFixed(2) ?? '—'}</strong></span><span>Taxable amount <strong>{currency} {totals?.taxableAmount.toFixed(2) ?? '—'}</strong></span><span>Tax <strong>{currency} {totals?.taxAmount.toFixed(2) ?? '—'}</strong></span><span>Total <strong>{currency} {totals?.total.toFixed(2) ?? '—'}</strong></span></div>
    {formError && <p className="feature-form-error" role="alert">{formError}</p>}
    <div className="feature-form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create draft'}</Button></div>
    {isDemo && <small>Temporary development mode: this draft is kept in local memory only and is not saved to Supabase.</small>}
  </form>
}
