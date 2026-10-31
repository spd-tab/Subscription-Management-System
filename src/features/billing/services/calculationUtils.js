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
  if (units === 0 || Math.abs(units * 100 - Math.round(units * 100)) > Number.EPSILON * 100) {
    throw new RangeError('Quantity must be greater than zero and have no more than two decimal places.')
  }
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

export function calculateInvoiceItemTotals(items, discountAmount = 0, defaultTaxRatePercent = 0) {
  if (!Array.isArray(items) || items.length === 0) throw new TypeError('At least one invoice item is required.')
  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0 || Math.abs(quantity * 100 - Math.round(quantity * 100)) > Number.EPSILON * 100) {
      throw new RangeError('Invoice item quantity must be positive and have no more than two decimal places.')
    }
    const unitPrice = assertFiniteNonNegative(item.unitPrice, 'Unit price')
    return { ...item, quantity, unitPrice, subtotal: calculateSubscriptionSubtotal(unitPrice, quantity) }
  })
  const subtotal = roundCurrency(normalizedItems.reduce((total, item) => total + item.subtotal, 0))
  const discount = assertFiniteNonNegative(discountAmount, 'Discount amount')
  if (discount > subtotal) throw new RangeError('Discount cannot exceed the subtotal.')
  let remainingDiscount = roundCurrency(discount)
  const lines = normalizedItems.map((item, index) => {
    const lineDiscount = index === normalizedItems.length - 1
      ? remainingDiscount
      : subtotal === 0 ? 0 : Math.min(item.subtotal, roundCurrency(discount * item.subtotal / subtotal))
    remainingDiscount = roundCurrency(remainingDiscount - lineDiscount)
    const taxableAmount = calculateTaxableAmount(item.subtotal, lineDiscount)
    const taxRatePercent = item.taxRatePercent ?? defaultTaxRatePercent
    const taxAmount = calculateTax(taxableAmount, taxRatePercent)
    return {
      ...item,
      discountAmount: lineDiscount,
      taxableAmount,
      taxRatePercent: Number(taxRatePercent),
      taxAmount,
      totalAmount: roundCurrency(taxableAmount + taxAmount),
    }
  })
  const totals = lines.reduce((result, line) => ({
    subtotal: roundCurrency(result.subtotal + line.subtotal),
    discountAmount: roundCurrency(result.discountAmount + line.discountAmount),
    taxableAmount: roundCurrency(result.taxableAmount + line.taxableAmount),
    taxAmount: roundCurrency(result.taxAmount + line.taxAmount),
    total: roundCurrency(result.total + line.totalAmount),
  }), { subtotal: 0, discountAmount: 0, taxableAmount: 0, taxAmount: 0, total: 0 })
  return { items: lines, ...totals }
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

export function calculatePreviousBillingDate(dateValue, frequency, interval = 1, anchorDateValue = dateValue) {
  const { year, month, date } = parseDateOnly(dateValue)
  const { day: anchorDay } = parseDateOnly(anchorDateValue)
  if (!FREQUENCIES.has(frequency)) throw new TypeError(`Billing frequency must be one of: ${[...FREQUENCIES].join(', ')}.`)
  const count = Number(interval)
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Billing interval must be a positive whole number.')

  if (frequency === 'daily') date.setUTCDate(date.getUTCDate() - count)
  if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() - count * 7)
  if (frequency === 'monthly' || frequency === 'yearly') {
    const targetMonthIndex = month - 1 - (frequency === 'monthly' ? count : count * 12)
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
