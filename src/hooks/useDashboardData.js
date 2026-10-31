
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../services/supabase/client.js'

function getLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCalendarDate(value) {
  if (typeof value !== 'string' || !value) return null

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    const date = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3])
    )
    return getLocalDateKey(date) === value ? value : null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : getLocalDateKey(date)
}

function isWithinDateRange(value, startDate, endDate) {
  const date = getCalendarDate(value)
  return Boolean(
    date &&
      (!startDate || date >= startDate) &&
      (!endDate || date <= endDate)
  )
}

function getInvoiceBalance(invoice) {
  return Math.max(
    Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0),
    0
  )
}

export function useDashboardData(startDate, endDate) {
  const [data, setData] = useState({
    customers: [],
    subscriptions: [],
    invoices: [],
    payments: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      setLoading(true)
      setError(null)

      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setError('Supabase is not configured. Check your .env file.')
          setLoading(false)
        }
        return
      }

      try {
        const [customersResult, subscriptionsResult, invoicesResult, paymentsResult] =
          await Promise.all([
            supabase.from('customers').select('*'),
            supabase
              .from('subscriptions')
              .select('*, subscription_items(quantity, unit_price)'),
            supabase.from('invoices').select('*'),
            supabase.from('payments').select('*'),
          ])

        const results = [
          customersResult,
          subscriptionsResult,
          invoicesResult,
          paymentsResult,
        ]

        const failed = results.find((result) => result.error)
        if (failed) throw failed.error

        if (!cancelled) {
          setData({
            customers: customersResult.data || [],
            subscriptions: subscriptionsResult.data || [],
            invoices: invoicesResult.data || [],
            payments: paymentsResult.data || [],
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load dashboard data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboardData()

    return () => {
      cancelled = true
    }
  }, [])

  const newCustomers = data.customers.filter((customer) =>
    isWithinDateRange(customer.created_at, startDate, endDate)
  ).length
  const activeSubscriptions = data.subscriptions.filter(
    (item) => item.status?.toLowerCase() === 'active'
  ).length
  const pausedSubscriptions = data.subscriptions.filter(
    (item) => item.status?.toLowerCase() === 'paused'
  ).length
  const newSubscriptions = data.subscriptions.filter((subscription) =>
    isWithinDateRange(subscription.created_at, startDate, endDate)
  ).length
  const periodInvoices = data.invoices.filter((invoice) =>
    isWithinDateRange(invoice.issue_date, startDate, endDate)
  )
  const totalInvoices = periodInvoices.length
  const paidInvoices = periodInvoices.filter(
    (invoice) => invoice.status?.toLowerCase() === 'paid'
  ).length

  const outstandingAmount = data.invoices.reduce((total, invoice) => {
    if (
      ['draft', 'cancelled', 'paid'].includes(invoice.status?.toLowerCase())
    ) {
      return total
    }
    return total + getInvoiceBalance(invoice)
  }, 0)

  const overdueInvoices = data.invoices.filter((invoice) => {
    return (
      invoice.due_date &&
      getCalendarDate(invoice.due_date) < getLocalDateKey(new Date()) &&
      getInvoiceBalance(invoice) > 0 &&
      !['paid', 'cancelled', 'draft'].includes(invoice.status?.toLowerCase())
    )
  })

  const totalCollectedRevenue = data.payments
    .filter(
      (payment) =>
        isWithinDateRange(payment.payment_date, startDate, endDate) &&
        ['paid', 'confirmed'].includes(payment.status?.toLowerCase())
    )
    .reduce((total, payment) => total + Number(payment.amount || 0), 0)

  const monthlyRecurringRevenue = data.subscriptions.reduce((total, sub) => {
    if (sub.status?.toLowerCase() !== 'active') return total

    const intervalCount = Number(sub.interval_count || 1)
    const billingInterval = sub.billing_interval?.toLowerCase()
    const recurringSubtotal = (sub.subscription_items || []).reduce(
      (subtotal, item) =>
        subtotal +
        Number(item.unit_price || 0) * Number(item.quantity || 0),
      0
    )
    const monthlyFactor = {
      daily: 365 / 12,
      weekly: 52 / 12,
      monthly: 1,
      yearly: 1 / 12,
    }[billingInterval]

    if (
      !monthlyFactor ||
      !Number.isFinite(intervalCount) ||
      intervalCount <= 0
    ) {
      return total
    }
    return total + (recurringSubtotal * monthlyFactor) / intervalCount
  }, 0)

  return {
    ...data,
    loading,
    error,
    stats: {
      newCustomers,
      activeSubscriptions,
      pausedSubscriptions,
      newSubscriptions,
      totalInvoices,
      paidInvoices,
      outstandingAmount,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((total, invoice) => {
        return total + getInvoiceBalance(invoice)
      }, 0),
      totalCollectedRevenue,
      monthlyRecurringRevenue,
    },
  }
}
