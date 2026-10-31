import { isValidDateOnly } from '../../billing/services/calculationUtils.js'

export function validateSubscriptionDraft(input, selectedPlan) {
  if (!input.customerId || !selectedPlan) return 'Select a customer and a plan.'
  const quantity = Number(input.quantity)
  if (!Number.isInteger(quantity) || quantity < 1) return 'Quantity must be a whole number greater than zero.'
  if (!isValidDateOnly(input.startDate)) return 'Enter a valid start date.'
  if (input.expiryDate && !isValidDateOnly(input.expiryDate)) return 'Enter a valid expiry date.'
  if (input.expiryDate && input.expiryDate <= input.startDate) return 'Expiry date must be after the start date.'
  if (!Number.isInteger(Number(input.billingInterval)) || Number(input.billingInterval) < 1) return 'Billing interval must be a positive whole number.'
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(input.billingFrequency)) return 'Select a supported billing frequency.'
  return ''
}
