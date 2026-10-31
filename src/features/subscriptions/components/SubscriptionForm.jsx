import { useMemo, useState } from 'react'
import { Button, DatePicker, FormInput, SelectInput } from '../../../components/common/UI'
import { calculateNextBillingDate, calculateSubscriptionSubtotal, getLocalDateOnly } from '../../billing/services/calculationUtils'
import { validateSubscriptionDraft } from '../services/subscriptionValidation'

export default function SubscriptionForm({ customers, plans, onSubmit, onCancel, submitting = false, isDemo = false }) {
  const [values, setValues] = useState({
    customerId: '',
    planId: '',
    quantity: '1',
    startDate: getLocalDateOnly(),
    expiryDate: '',
    billingFrequency: '',
    billingInterval: '',
  })
  const [formError, setFormError] = useState('')
  const selectedPlan = plans.find((plan) => plan.id === values.planId)
  const billingFrequency = values.billingFrequency || selectedPlan?.billingFrequency || 'monthly'
  const interval = Number(values.billingInterval || selectedPlan?.billingInterval || '')
  const preview = useMemo(() => {
    if (!selectedPlan || !values.startDate || !Number.isInteger(interval) || interval < 1) return null
    try {
      return {
        subtotal: calculateSubscriptionSubtotal(selectedPlan.unitPrice, Number(values.quantity)),
        nextBillingDate: calculateNextBillingDate(values.startDate, billingFrequency, interval),
      }
    } catch {
      return null
    }
  }, [selectedPlan, values.startDate, values.quantity, billingFrequency, interval])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateSubscriptionDraft({ ...values, billingFrequency, billingInterval: interval }, selectedPlan)
    if (validationError) {
      setFormError(validationError)
      return
    }
    if (!preview) {
      setFormError('Review the plan, quantity, and billing dates.')
      return
    }
    try {
      await onSubmit({
        customerId: values.customerId,
        planId: selectedPlan.id,
        quantity: Number(values.quantity),
        unitPrice: selectedPlan.unitPrice,
        currency: selectedPlan.currency,
        billingFrequency,
        billingInterval: interval,
        startDate: values.startDate,
        expiryDate: values.expiryDate || null,
        nextBillingDate: preview.nextBillingDate,
        status: 'Draft',
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create subscription.')
    }
  }

  return <form className="modal-form feature-form" onSubmit={handleSubmit} noValidate>
    <SelectInput id="subscription-customer" label="Customer" required value={values.customerId} onChange={(event) => update('customerId', event.target.value)} options={[{ value: '', label: 'Select a customer' }, ...customers.map((customer) => ({ value: customer.id, label: `${customer.name} (${customer.email})` }))]} />
    <SelectInput id="subscription-plan" label="Plan" required value={values.planId} onChange={(event) => {
      const plan = plans.find((item) => item.id === event.target.value)
      setValues((current) => ({
        ...current,
        planId: event.target.value,
        billingFrequency: plan?.billingFrequency ?? '',
        billingInterval: plan ? String(plan.billingInterval) : '',
      }))
      setFormError('')
    }} options={[{ value: '', label: 'Select a plan' }, ...plans.map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.currency} ${plan.unitPrice.toFixed(2)}` }))]} />
    {selectedPlan && <div className="feature-form-grid">
      <FormInput id="subscription-quantity" label="Quantity" type="number" min="1" step="1" required value={values.quantity} onChange={(event) => update('quantity', event.target.value)} />
      <div className="form-field"><span>Unit price</span><strong>{selectedPlan.currency} {selectedPlan.unitPrice.toFixed(2)}</strong></div>
    </div>}
    <div className="feature-form-grid">
      <DatePicker id="subscription-start" label="Start date" required value={values.startDate} onChange={(event) => update('startDate', event.target.value)} />
      <DatePicker id="subscription-expiry" label="Expiry date (optional)" min={values.startDate} value={values.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} />
    </div>
    <div className="feature-form-grid">
      <SelectInput id="subscription-frequency" label="Billing frequency" value={billingFrequency} onChange={(event) => update('billingFrequency', event.target.value)} options={['daily', 'weekly', 'monthly', 'yearly'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
      <FormInput id="subscription-interval" label="Every (frequency units)" type="number" min="1" step="1" required value={values.billingInterval} onChange={(event) => update('billingInterval', event.target.value)} />
    </div>
    {preview && <div className="feature-summary"><span>Subtotal for this period <strong>{selectedPlan.currency} {preview.subtotal.toFixed(2)}</strong></span><span>Next billing date <strong>{preview.nextBillingDate}</strong></span></div>}
    {formError && <p className="feature-form-error" role="alert">{formError}</p>}
    <div className="feature-form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create draft'}</Button></div>
    {isDemo && <small>Temporary development mode: this draft is kept in local memory only and is not saved to Supabase.</small>}
  </form>
}
