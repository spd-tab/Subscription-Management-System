import { useEffect, useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, ErrorState, LoadingState, MetricCard, Modal, SearchBar } from '../../../components/common/UI'
import InvoiceForm from '../components/InvoiceForm'
import { isUsingDevelopmentInvoices, invoiceService } from '../services/invoiceService'
import { subscriptionService } from '../../subscriptions/services/subscriptionService'
import '../billing.css'
import '../../subscriptions/subscription.css'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [taxRates, setTaxRates] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const isDemo = isUsingDevelopmentInvoices()

  useEffect(() => {
    let active = true
    setLoading(true)
    setListError('')
    invoiceService.list({ search, status }).then((records) => {
      if (active) setInvoices(records)
    }).catch((loadError) => {
      if (active) setListError(loadError instanceof Error ? loadError.message : 'Unable to load invoices.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [search, status, refreshVersion])

  useEffect(() => {
    let active = true
    setOptionsLoading(true)
    Promise.all([subscriptionService.listCustomers(), invoiceService.listTaxRates()])
      .then(([customerRecords, rates]) => {
        if (active) {
          setCustomers(customerRecords)
          setTaxRates(rates)
        }
      })
      .catch((loadError) => { if (active) setOptionsError(loadError instanceof Error ? loadError.message : 'Unable to load invoice options.') })
      .finally(() => { if (active) setOptionsLoading(false) })
    return () => { active = false }
  }, [])

  async function createDraft(input) {
    setSubmitting(true)
    try {
      await invoiceService.createDraft(input)
      setFormOpen(false)
      setRefreshVersion((version) => version + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const totalDue = invoices.filter((invoice) => ['Confirmed', 'Pending', 'Overdue'].includes(invoice.status)).reduce((total, invoice) => total + (invoice.outstandingBalance ?? invoice.total), 0)
  const invoiceStatuses = isDemo
    ? ['all', 'Draft', 'Pending', 'Paid', 'Overdue']
    : ['all', 'Draft', 'Confirmed', 'Paid', 'Cancelled', 'Overdue']

  return <section className="feature-page">
    <div className="page-heading"><div><h1>Invoices</h1><p>Review invoice drafts, billing periods, and collection status</p></div><Button disabled={optionsLoading || Boolean(optionsError) || customers.length === 0} onClick={() => setFormOpen(true)}><Plus size={18} /> Create invoice</Button></div>
    {isDemo && <p className="feature-demo-notice">Temporary development demo data — changes are held in local memory and are not saved to Supabase.</p>}
    {optionsError && <ErrorState message={optionsError} />}
    <div className="invoice-metrics"><MetricCard label="Invoices shown" value={`${invoices.length}`} delta="Current filter" /><MetricCard label="Outstanding shown" value={`${isDemo ? '$' : 'INR '}${totalDue.toLocaleString()}`} delta="Confirmed and overdue balances" /><MetricCard label="Persistence" value={isDemo ? 'Demo only' : 'Supabase'} delta="No payment provider action" /></div>
    <div className="feature-toolbar"><SearchBar value={search} onChange={setSearch} placeholder="Search invoice number or customer..." /><select aria-label="Filter invoice status" value={status} onChange={(event) => setStatus(event.target.value)}>{invoiceStatuses.map((value) => <option key={value} value={value}>{value === 'all' ? 'All statuses' : value}</option>)}</select></div>
    {loading ? <LoadingState label="Loading invoices…" /> : listError ? <ErrorState message={listError} /> : invoices.length === 0 ? <EmptyState title="No invoices found" description="Change the filters or create a draft invoice." /> : <div className="feature-invoice-list">{invoices.map((invoice) => <article className="feature-invoice-row" key={invoice.id}><div><strong>{invoice.invoiceNumber} · {invoice.customerName}</strong><small>Issued {invoice.issuedAt} · Due {invoice.dueAt ?? 'Not set'} · {invoice.items.length} line item(s)</small></div><div className="feature-invoice-amount"><span>{invoice.currency} {Number(invoice.total).toFixed(2)}</span><span className={`status-badge ${invoice.status === 'Overdue' || invoice.status === 'Cancelled' ? 'danger' : ['Draft', 'Confirmed', 'Pending'].includes(invoice.status) ? 'warning' : 'success'}`}>{invoice.status}</span></div><Link className="arrow-link" to={`/admin/invoices/${encodeURIComponent(invoice.id)}`} aria-label={`View ${invoice.invoiceNumber}`}><ArrowRight size={17} /></Link></article>)}</div>}
    {formOpen && <Modal title="Create invoice draft" onClose={() => setFormOpen(false)}><InvoiceForm customers={customers} taxRates={taxRates} onSubmit={createDraft} onCancel={() => setFormOpen(false)} submitting={submitting} isDemo={isDemo} /></Modal>}
  </section>
}
