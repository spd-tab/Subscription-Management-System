import { useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { moduleData, customers, subscriptions, invoices, payments } from '../data/mockData'
import { Button, DataTable, FilterDropdown, MetricCard, Modal, Pagination, SearchBar, StatusBadge } from '../components/common/UI'

export const routeMeta = {
  '/admin/customers/:id': ['Customer details', 'Account profile, subscriptions, and billing activity', 'customers'],
  '/admin/products': ['Products', 'Manage your catalog and product variants', 'products'],
  '/admin/products/:id': ['Product details', 'Product information and available variants', 'products'],
  '/admin/plans': ['Subscription plans', 'Configure pricing and billing intervals', 'plans'],
  '/admin/quotations': ['Quotations', 'Prepare and track customer proposals', 'quotations'],
  '/admin/quotation-templates': ['Quotation templates', 'Reusable proposal templates for your team', 'quotations'],
  '/admin/subscriptions/:id': ['Subscription details', 'Contract, renewal, and billing history', 'subscriptions'],
  '/admin/invoices/:id': ['Invoice details', 'Invoice status, line items, and payment activity', 'invoices'],
  '/admin/payments': ['Payments', 'Review transactions and payment activity', 'payments'],
  '/admin/discounts': ['Discounts', 'Manage promotional codes and customer offers', 'discounts'],
  '/admin/taxes': ['Tax configuration', 'Tax rules for your billing regions', 'taxes'],
  '/admin/reports': ['Reports & analytics', 'Revenue, retention, and customer growth', 'reports'],
  '/admin/team': ['Team members', 'Manage workspace access and permissions', 'team'],
  '/admin/settings': ['Settings', 'Manage workspace preferences and billing configuration', 'settings'],
  '/portal/dashboard': ['Your account', 'A clear overview of your Brightloop services', 'subscriptions'],
  '/portal/subscriptions': ['My subscriptions', 'Manage your active plans and renewals', 'subscriptions'],
  '/portal/invoices': ['My invoices', 'View invoices and payment status', 'invoices'],
  '/portal/payments': ['Payment history', 'Your recent transactions', 'payments'],
}

const detailRows = {
  customers: customers.map(({ name, email, segment, mrr, status }) => [name, email, segment, `$${mrr.toLocaleString()}/mo`, status]),
  subscriptions: subscriptions.map(({ customer, plan, billing, monthly, status }) => [customer, plan, billing, `$${monthly.toLocaleString()}/mo`, status]),
  invoices: invoices.map(({ id, customer, date, amount, status }) => [id, customer, date, `$${amount.toLocaleString()}`, status]),
  payments: payments.map(({ id, customer, method, amount, status }) => [id, customer, method, `$${amount.toLocaleString()}`, status]),
}

export default function ModulePage({ meta }) {
  const params = useParams()
  const { open, show, close } = useModalState()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const routeMetaValues = meta ?? Object.values(routeMeta).find((item) => item[0].toLowerCase().replaceAll(' ', '-') === params.module)
  const [title, description, key] = routeMetaValues ?? ['Workspace', 'Manage your Brightloop workspace', 'reports']
  const config = moduleData[key]
  const rows = config?.rows ?? detailRows[key] ?? []
  const filteredRows = rows.filter((row) => row.join(' ').toLowerCase().includes(search.toLowerCase()))
    .filter((row) => statusFilter === 'all' || (statusFilter === 'active' ? /active|paid|accepted/i.test(row[row.length - 1]) : /pending|overdue|draft|invited|sent/i.test(row[row.length - 1])))
  const isPortal = window.location.pathname.startsWith('/portal/')
  const columns = config?.columns ?? ({ customers: ['Customer', 'Email', 'Segment', 'MRR', 'Status'], subscriptions: ['Customer', 'Plan', 'Billing', 'MRR', 'Status'], invoices: ['Invoice', 'Customer', 'Date', 'Amount', 'Status'], payments: ['Payment', 'Customer', 'Method', 'Amount', 'Status'] }[key] ?? ['Name', 'Details', 'Type', 'Value', 'Status'])
  const relatedPath = key === 'customers' ? '/admin/customers' : key === 'subscriptions' ? '/admin/subscriptions' : key === 'invoices' ? '/admin/invoices' : '/admin/payments'
  const heading = title === 'Customer details' && params.id ? customers.find((item) => item.id === params.id)?.name ?? title : title
  const pagedRows = filteredRows.slice((page - 1) * 8, page * 8)

  return <><div className="breadcrumbs"><Link to={isPortal ? '/portal/dashboard' : '/admin/dashboard'}>{isPortal ? 'Portal' : 'Workspace'}</Link><span>/</span>{heading}</div><div className="page-heading"><div><h1>{heading}</h1><p>{description}</p></div>{!isPortal && <Button onClick={show}><Plus size={18} /> {key === 'invoices' ? 'Create invoice' : key === 'subscriptions' ? 'New subscription' : `Add ${title.replace(/s$/, '').toLowerCase()}`}</Button>}</div>
    <div className="module-metrics"><MetricCard label="Total records" value={key === 'customers' ? '948' : key === 'subscriptions' ? '1,842' : key === 'invoices' ? '24' : '128'} delta="Updated just now" /><MetricCard label="Active this month" value={key === 'customers' ? '912' : '96.2%'} delta="+5.8% vs last month" /><MetricCard label="Needs attention" value={key === 'invoices' ? '$3,200' : '4'} delta="Review activity" tone={key === 'invoices' ? 'danger' : undefined} /></div>
    <section className="panel module-table-panel"><div className="module-toolbar"><SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder={`Search ${title.toLowerCase()}...`} /><FilterDropdown value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1) }} options={[{ value: 'all', label: 'All records' }, { value: 'active', label: 'Active / settled' }, { value: 'attention', label: 'Needs attention' }]} /></div><DataTable columns={columns} rows={pagedRows} renderCell={(cell, row, cellIndex) => cellIndex === row.length - 1 ? <StatusBadge>{cell}</StatusBadge> : cell} renderActions={(row) => { const customer = customers.find((item) => item.name === row[0]); const subscription = subscriptions.find((item) => item.customer === row[0]); const invoice = invoices.find((item) => item.id === row[0]); const path = key === 'customers' ? `/admin/customers/${customer?.id ?? 'cus_001'}` : key === 'subscriptions' ? `/admin/subscriptions/${subscription?.id ?? 'sub_001'}` : key === 'invoices' ? `/admin/invoices/${invoice?.id ?? 'INV-2025-1048'}` : key === 'products' ? `/admin/products/${encodeURIComponent(row[0])}` : relatedPath; return <Link to={path} className="table-link">View <ArrowRight size={14} /></Link> }} emptyText="No matching records found." /><Pagination page={page} pages={Math.max(1, Math.ceil(filteredRows.length / 8))} onChange={setPage} /></section>
    {open && <Modal title={key === 'invoices' ? 'Create invoice' : `Add ${title.replace(/s$/, '').toLowerCase()}`} onClose={close}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); close() }}><label>Name<input required placeholder="Enter a name" /></label><label>Notes<input placeholder="Optional details" /></label><Button type="submit">Save draft</Button><small>Demo only: this change is not persisted to a server.</small></form></Modal>}
  </>
}

function useModalState() {
  const [open, setOpen] = useState(false)
  return { open, show: () => setOpen(true), close: () => setOpen(false) }
}
