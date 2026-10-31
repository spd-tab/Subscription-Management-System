import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, ErrorState, LoadingState, Modal } from '../../../components/common/UI'
import SubscriptionStatusBadge from '../components/SubscriptionStatusBadge'
import { isUsingDevelopmentSubscriptions, subscriptionService } from '../services/subscriptionService'
import { canGenerateInvoice, transitionSubscription } from '../services/subscriptionLifecycle'
import '../subscription.css'

export default function SubscriptionDetailsPage() {
  const { id } = useParams()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmAction, setConfirmAction] = useState('')
  const [pendingAction, setPendingAction] = useState(false)
  const actionPendingRef = useRef(false)
  const isDemo = isUsingDevelopmentSubscriptions()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setSubscription(null)
    subscriptionService.getById(decodeURIComponent(id)).then((record) => {
      if (active) setSubscription(record)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load subscription.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id])

  async function performAction(action) {
    if (actionPendingRef.current) return
    actionPendingRef.current = true
    setActionError('')
    setPendingAction(true)
    try {
      const updated = transitionSubscription(subscription, action)
      setSubscription(await subscriptionService.update(subscription.id, updated))
      setConfirmAction('')
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'Unable to update subscription.')
    } finally {
      actionPendingRef.current = false
      setPendingAction(false)
    }
  }

  function requestAction(action) {
    if (actionPendingRef.current) return
    if (action === 'close' || action === 'renew') {
      setConfirmAction(action)
      setActionError('')
      return
    }
    performAction(action)
  }

  if (loading) return <LoadingState label="Loading subscription…" />
  if (error) return <ErrorState message={error} />
  if (!subscription) return <div className="feature-empty">Subscription not found.</div>

  const lifecycleAction = { Draft: 'quotation', Quotation: 'confirm', Confirmed: 'activate' }[subscription.status]

  return <section className="feature-page">
    <div className="breadcrumbs"><Link to="/admin/subscriptions">Subscriptions</Link><span>/</span>{subscription.id}</div>
    <div className="page-heading"><div><h1>{subscription.customerName}</h1><p>{subscription.planName} · {subscription.id}</p></div><SubscriptionStatusBadge status={subscription.status} /></div>
    {isDemo && <p className="feature-demo-notice">Development demo data — lifecycle changes are held in local memory and are not saved to Supabase.</p>}
    <div className="panel">
      <h2 className="panel-title">Subscription details</h2>
      <div className="feature-detail-grid">
        <Detail label="Quantity" value={subscription.quantity} />
        <Detail label="Unit price" value={`${subscription.currency} ${Number(subscription.unitPrice).toFixed(2)}`} />
        <Detail label="Billing frequency" value={`Every ${subscription.billingInterval} ${subscription.billingFrequency}`} />
        <Detail label="Start date" value={subscription.startDate} />
        <Detail label="Expiry date" value={subscription.expiryDate ?? 'No expiry set'} />
        <Detail label="Next billing date" value={subscription.nextBillingDate} />
        <Detail label="Customer reference" value={subscription.customerId} />
        <Detail label="Plan reference" value={subscription.planId} />
        <Detail label="Invoice eligibility" value={canGenerateInvoice(subscription) ? 'Eligible (subject to being due)' : 'Not eligible'} />
      </div>
      <div className="feature-workflow">{['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'].map((status) => <span className={subscription.status === status ? 'current' : ''} key={status}>{status}</span>)}</div>
      {actionError && <p className="feature-form-error" role="alert">{actionError}</p>}
      <div className="feature-card-actions">
        {lifecycleAction && <Button variant="secondary" disabled={pendingAction} onClick={() => requestAction(lifecycleAction)}>{pendingAction ? 'Updating…' : lifecycleAction === 'quotation' ? 'Send quotation' : lifecycleAction === 'confirm' ? 'Confirm' : 'Activate'}</Button>}
        {subscription.status === 'Active' && <Button variant="secondary" disabled={pendingAction} onClick={() => requestAction('pause')}>{pendingAction ? 'Updating…' : 'Pause'}</Button>}
        {subscription.status === 'Paused' && <Button variant="secondary" disabled={pendingAction} onClick={() => requestAction('resume')}>{pendingAction ? 'Updating…' : 'Resume'}</Button>}
        {subscription.status === 'Active' && <Button variant="secondary" disabled={pendingAction} onClick={() => requestAction('renew')}>{pendingAction ? 'Updating…' : 'Renew'}</Button>}
        {['Active', 'Paused'].includes(subscription.status) && <Button disabled={pendingAction} onClick={() => requestAction('close')}>{pendingAction ? 'Updating…' : 'Close subscription'}</Button>}
      </div>
    </div>
    {confirmAction && <Modal title={confirmAction === 'close' ? 'Close subscription?' : 'Renew subscription?'} onClose={() => { if (!pendingAction) setConfirmAction('') }}><div className="confirmation-content"><p>{confirmAction === 'close' ? 'Closing stops this subscription from being billed. This action should be treated as final.' : `Renew this subscription and advance its next billing date from ${subscription.nextBillingDate}?`}</p>{actionError && <p className="feature-form-error" role="alert">{actionError}</p>}<div><Button variant="secondary" disabled={pendingAction} onClick={() => setConfirmAction('')}>Cancel</Button><Button disabled={pendingAction} onClick={() => performAction(confirmAction)}>{pendingAction ? 'Processing…' : confirmAction === 'close' ? 'Close subscription' : 'Renew subscription'}</Button></div></div></Modal>}
  </section>
}

function Detail({ label, value }) {
  return <div className="feature-detail-cell"><span>{label}</span><strong>{value}</strong></div>
}
