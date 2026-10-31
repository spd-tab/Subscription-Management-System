export default function SubscriptionStatusBadge({ status }) {
  const tone = ['Draft', 'Quotation', 'Paused'].includes(status) ? 'warning' : status === 'Closed' ? 'subscription-closed' : 'success'
  return <span className={`status-badge ${tone}`}>{status}</span>
}
