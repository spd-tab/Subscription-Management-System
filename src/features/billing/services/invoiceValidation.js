import { isValidDateOnly } from './calculationUtils.js'

export function validateInvoiceDraft({ customerId, items, discountType, discountValue, taxRatePercent, subtotal, dueAt }) {
  if (!customerId) return 'Select a customer.'
  if (dueAt && !isValidDateOnly(dueAt)) return 'Enter a valid invoice due date.'
  if (!Array.isArray(items) || items.length === 0 || items.some((item) =>
    !item.description?.trim() ||
    !Number.isFinite(Number(item.quantity)) ||
    Number(item.quantity) <= 0 ||
    Math.abs(Number(item.quantity) * 100 - Math.round(Number(item.quantity) * 100)) > Number.EPSILON * 100 ||
    !Number.isFinite(Number(item.unitPrice)) ||
    Number(item.unitPrice) < 0,
  )) return 'Add at least one valid line item.'
  const discount = Number(discountValue || 0)
  if (!Number.isFinite(discount) || discount < 0 || (discountType === 'percentage' && discount > 100)) {
    return 'Discount value must be within the supported range.'
  }
  if (discountType === 'fixed' && Number.isFinite(Number(subtotal)) && discount > Number(subtotal)) {
    return 'Fixed discount cannot exceed the invoice subtotal.'
  }
  const taxRate = Number(taxRatePercent || 0)
  if (!Number.isFinite(taxRate) || taxRate < 0) return 'Tax rate must be a valid non-negative number.'
  return ''
}
