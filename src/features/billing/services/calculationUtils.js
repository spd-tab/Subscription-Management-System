const FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly'])

function assertFiniteNonNegative(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw new RangeError(`${label} must be a finite, non-negative number.`)
  return number
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError('Date must use the YYYY-MM-DD format.')
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`"${value}" is not a valid calendar date.`)
  }
  return { year, month, day, date }
}

export function isValidDateOnly(value) {
  try {
    parseDateOnly(value)
    return true
  } catch {
    return false
  }
}

export function getLocalDateOnly(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new TypeError('A valid Date instance is required.')
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateOnly(date) {
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`
}

export function calculateSubscriptionSubtotal(unitPrice, quantity = 1) {
  const price = assertFiniteNonNegative(unitPrice, 'Unit price')
  const units = assertFiniteNonNegative(quantity, 'Quantity')
  if (!Number.isInteger(units)) throw new RangeError('Quantity must be a whole number.')
  return roundCurrency(price * units)
}

export function calculatePercentageDiscount(subtotal, percentage) {
  const amount = assertFiniteNonNegative(subtotal, 'Subtotal')
  const percent = assertFiniteNonNegative(percentage, 'Discount percentage')
  if (percent > 100) throw new RangeError('Discount percentage cannot exceed 100.')
  return roundCurrency(amount * percent / 100)
}

export function calculateFixedDiscount(subtotal, fixedAmount) {
  const amount = assertFiniteNonNegative(subtotal, 'Subtotal')
  const discount = assertFiniteNonNegative(fixedAmount, 'Fixed discount')
  if (discount > amount) throw new RangeError('Fixed discount cannot exceed the subtotal.')
  return roundCurrency(discount)
}

export function calculateDiscountAmount(subtotal, discount = { type: 'fixed', value: 0 }) {
  if (!discount || !['fixed', 'percentage'].includes(discount.type)) {
    throw new TypeError('Discount type must be "fixed" or "percentage".')
  }
  return discount.type === 'percentage'
    ? calculatePercentageDiscount(subtotal, discount.value)
    : calculateFixedDiscount(subtotal, discount.value)
}

export function calculateTaxableAmount(subtotal, discountAmount = 0) {
  const amount = assertFiniteNonNegative(subtotal, 'Subtotal')
  const discount = assertFiniteNonNegative(discountAmount, 'Discount amount')
  if (discount > amount) throw new RangeError('Discount cannot exceed the subtotal.')
  return roundCurrency(amount - discount)
}

export function calculateTax(taxableAmount, taxRatePercent) {
  const amount = assertFiniteNonNegative(taxableAmount, 'Taxable amount')
  const rate = assertFiniteNonNegative(taxRatePercent, 'Tax rate')
  return roundCurrency(amount * rate / 100)
}

export function calculateInvoiceTotal({ subtotal, discountAmount = 0, taxRatePercent = 0 }) {
  const normalizedSubtotal = assertFiniteNonNegative(subtotal, 'Subtotal')
  const normalizedDiscount = assertFiniteNonNegative(discountAmount, 'Discount amount')
  const taxableAmount = calculateTaxableAmount(normalizedSubtotal, normalizedDiscount)
  const taxAmount = calculateTax(taxableAmount, taxRatePercent)
  return {
    subtotal: roundCurrency(normalizedSubtotal),
    discountAmount: roundCurrency(normalizedDiscount),
    taxableAmount,
    taxAmount,
    total: roundCurrency(taxableAmount + taxAmount),
  }
}

export function calculateNextBillingDate(dateValue, frequency, interval = 1, anchorDateValue = dateValue) {
  const { year, month, day, date } = parseDateOnly(dateValue)
  const { day: anchorDay } = parseDateOnly(anchorDateValue)
  if (!FREQUENCIES.has(frequency)) throw new TypeError(`Billing frequency must be one of: ${[...FREQUENCIES].join(', ')}.`)
  const count = Number(interval)
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Billing interval must be a positive whole number.')

  if (frequency === 'daily') date.setUTCDate(date.getUTCDate() + count)
  if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() + count * 7)
  if (frequency === 'monthly' || frequency === 'yearly') {
    const targetMonthIndex = month - 1 + (frequency === 'monthly' ? count : count * 12)
    const targetYear = year + Math.floor(targetMonthIndex / 12)
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12
    const lastDayOfMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
    date.setUTCFullYear(targetYear, normalizedMonth, Math.min(anchorDay, lastDayOfMonth))
  }

  return formatDateOnly(date)
}

export function calculateInvoiceLinesSubtotal(items) {
  if (!Array.isArray(items)) throw new TypeError('Invoice items must be an array.')
  return roundCurrency(items.reduce((total, item) => total + calculateSubscriptionSubtotal(item.unitPrice, item.quantity), 0))
}
