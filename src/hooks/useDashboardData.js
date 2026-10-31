
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/client'

export function useDashboardData() {
  const [data, setData] = useState({
    customers: [],
    subscriptions: [],
    invoices: [],
    payments: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase is not configured. Check your .env file.')
        setLoading(false)
        return
      }

      try {
        const [customersResult, subscriptionsResult, invoicesResult, paymentsResult] =
          await Promise.all([
            supabase.from('customers').select('*'),
            supabase.from('subscriptions').select('*'),
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

        setData({
          customers: customersResult.data || [],
          subscriptions: subscriptionsResult.data || [],
          invoices: invoicesResult.data || [],
          payments: paymentsResult.data || [],
        })
      } catch (err) {
        setError(err.message || 'Unable to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const activeSubscriptions = data.subscriptions.filter(
    (item) => item.status?.toLowerCase() === 'active'
  ).length

  const outstandingAmount = data.invoices.reduce((total, invoice) => {
    const balance =
      Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)
    return total + Math.max(balance, 0)
  }, 0)

  const overdueInvoices = data.invoices.filter((invoice) => {
    const balance =
      Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)

    return (
      invoice.due_date &&
      new Date(invoice.due_date) < new Date() &&
      balance > 0 &&
      !['paid', 'cancelled', 'draft'].includes(
        invoice.status?.toLowerCase()
      )
    )
  })

  const totalPaid = data.payments
    .filter((payment) => payment.status?.toLowerCase() === 'paid')
    .reduce((total, payment) => total + Number(payment.amount || 0), 0)

  return {
    ...data,
    loading,
    error,
    stats: {
      totalCustomers: data.customers.length,
      activeSubscriptions,
      outstandingAmount,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((total, invoice) => {
        const balance =
          Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)
        return total + Math.max(balance, 0)
      }, 0),
      totalPaid,
    },
  }
}

