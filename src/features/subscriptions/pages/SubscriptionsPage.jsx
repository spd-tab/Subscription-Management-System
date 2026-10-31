import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, ErrorState, LoadingState, MetricCard, Modal, SearchBar } from '../../../components/common/UI'
import SubscriptionForm from '../components/SubscriptionForm'
import SubscriptionStatusBadge from '../components/SubscriptionStatusBadge'
import { isUsingDevelopmentSubscriptions, subscriptionService } from '../services/subscriptionService'
import '../subscription.css'

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([])
  const [customers, setCustomers] = useState([])
  const [plans, setPlans] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const isDemo = isUsingDevelopmentSubscriptions()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    subscriptionService.list({ search, status: statusFilter }).then((records) => {
      if (active) setSubscriptions(records)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load subscriptions.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [search, statusFilter, refreshVersion])

  useEffect(() => {
    let active = true
    setOptionsLoading(true)
    Promise.all([subscriptionService.listCustomers(), subscriptionService.listPlans()])
      .then(([customerRecords, planRecords]) => {
        if (active) {
          setCustomers(customerRecords)
          setPlans(planRecords)
        }
      })
      .catch((loadError) => {
        if (active) setOptionsError(loadError instanceof Error ? loadError.message : 'Unable to load subscription form options.')
      })
      .finally(() => {
        if (active) setOptionsLoading(false)
      })
    return () => { active = false }
  }, [])

  const activeCount = useMemo(() => subscriptions.filter((subscription) => subscription.status === 'Active').length, [subscriptions])
  const totalMrr = useMemo(() => subscriptions.filter((subscription) => subscription.status === 'Active').reduce((total, subscription) => {
    const interval = Number(subscription.billingInterval) || 1
    const divisor = subscription.billingFrequency === 'yearly' ? 12 * interval : subscription.billingFrequency === 'weekly' ? 52 * interval / 12 : subscription.billingFrequency === 'daily' ? 365 * interval / 12 : interval
    return total + subscription.unitPrice * subscription.quantity / divisor
  }, 0), [subscriptions])

  async function createSubscription(input) {
    setSubmitting(true)
    try {
      await subscriptionService.create(input)
      setFormOpen(false)
      setRefreshVersion((version) => version + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="subscription-page feature-page">
    <div className="page-heading"><div><h1>Subscriptions</h1><p>Manage contracts, billing schedules, and subscription lifecycle</p></div><Button disabled={optionsLoading || Boolean(optionsError) || customers.length === 0 || plans.length === 0} onClick={() => setFormOpen(true)}><Plus size={18} /> New subscription</Button></div>
    {isDemo && <p className="feature-demo-notice">Temporary development demo data — changes are held in local memory and are not saved to Supabase.</p>}
    {optionsError && <ErrorState message={optionsError} />}
    <div className="subscription-metrics">
      <MetricCard label="Total MRR (filtered)" value={`${isDemo ? '$' : 'INR '}${totalMrr.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} delta={`${activeCount} active in result`} />
      <MetricCard label="Subscriptions" value={`${subscriptions.length}`} delta="Matching current filters" />
      <MetricCard label="Billing status" value="Active only" delta="Only active subscriptions are billable" />
    </div>
    <div className="feature-toolbar"><SearchBar value={search} onChange={setSearch} placeholder="Search customer, plan, or subscription..." /><select aria-label="Filter subscription status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{['all', 'Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed'].map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : status}</option>)}</select></div>
    {loading ? <LoadingState label="Loading subscriptions…" /> : error ? <ErrorState message={error} /> : subscriptions.length === 0 ? <EmptyState title="No subscriptions found" description="Change the search or status filter, or create a draft subscription." /> : <div className="feature-list">{subscriptions.map((subscription) => <article className="feature-card" key={subscription.id}>
      <div className="feature-card-heading"><div><h2>{subscription.customerName}</h2><p>{subscription.planName} · {subscription.id}</p></div><SubscriptionStatusBadge status={subscription.status} /></div>
      <div className="feature-card-details">
        <span>Quantity <strong>{subscription.quantity}</strong></span>
        <span>Unit price <strong>{subscription.currency} {Number(subscription.unitPrice).toFixed(2)}</strong></span>
        <span>Frequency <strong>Every {subscription.billingInterval} {subscription.billingFrequency}</strong></span>
        <span>Start date <strong>{subscription.startDate}</strong></span>
        <span>Expiry date <strong>{subscription.expiryDate ?? 'No expiry set'}</strong></span>
        <span>Next billing <strong>{subscription.nextBillingDate}</strong></span>
      </div>
      <div className="feature-card-actions"><Link className="button button-secondary" to={`/admin/subscriptions/${encodeURIComponent(subscription.id)}`}>Details <ArrowRight size={15} /></Link></div>
    </article>)}</div>}
    {formOpen && <Modal title="Create subscription" onClose={() => setFormOpen(false)}><SubscriptionForm customers={customers} plans={plans} onSubmit={createSubscription} onCancel={() => setFormOpen(false)} submitting={submitting} isDemo={isDemo} /></Modal>}
  </section>
}
