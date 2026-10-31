import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../components/common/UI'
import InvoiceItemsTable from '../components/InvoiceItemsTable'
import { isUsingDevelopmentInvoices, invoiceService } from '../services/invoiceService'
import '../billing.css'
import '../../subscriptions/subscription.css'

export default function InvoiceDetailsPage() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    invoiceService.getById(decodeURIComponent(id)).then((record) => {
      if (active) setInvoice(record)
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load invoice.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id])

  if (loading) return <LoadingState label="Loading invoice…" />
  if (error) return <ErrorState message={error} />
  if (!invoice) return <div className="feature-empty">Invoice not found.</div>

  return <section className="feature-page">
    <div className="breadcrumbs"><Link to="/admin/invoices">Invoices</Link><span>/</span>{invoice.invoiceNumber}</div>
    <div className="page-heading"><div><h1>{invoice.invoiceNumber}</h1><p>{invoice.customerName}</p></div><span className={`status-badge ${invoice.status === 'Overdue' ? 'danger' : ['Draft', 'Pending'].includes(invoice.status) ? 'warning' : 'success'}`}>{invoice.status}</span></div>
    {isUsingDevelopmentInvoices() && <p className="feature-demo-notice">Development demo data — this record is not persisted to Supabase.</p>}
    <div className="panel feature-page">
      <div className="feature-detail-grid">
        <Detail label="Customer reference" value={invoice.customerId} />
        <Detail label="Subscription reference" value={invoice.subscriptionId ?? 'One-off / not linked'} />
        <Detail label="Currency" value={invoice.currency} />
        <Detail label="Issue date" value={invoice.issuedAt} />
        <Detail label="Due date" value={invoice.dueAt ?? 'Not set'} />
        <Detail label="Invoice number" value={invoice.invoiceNumber} />
      </div>
      <InvoiceItemsTable items={invoice.items} readOnly currency={invoice.currency} />
      <div className="feature-summary">
        <span>Subtotal <strong>{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</strong></span>
        <span>Discount <strong>− {invoice.currency} {Number(invoice.discountAmount).toFixed(2)}</strong></span>
        <span>Taxable amount <strong>{invoice.currency} {Number(invoice.taxableAmount).toFixed(2)}</strong></span>
        <span>Tax <strong>{invoice.currency} {Number(invoice.taxAmount).toFixed(2)}</strong></span>
        <span>Total <strong>{invoice.currency} {Number(invoice.total).toFixed(2)}</strong></span>
      </div>
      {invoice.note && <p className="feature-demo-notice">{invoice.note}</p>}
    </div>
  </section>
}

function Detail({ label, value }) {
  return <div className="feature-detail-cell"><span>{label}</span><strong>{value}</strong></div>
}
