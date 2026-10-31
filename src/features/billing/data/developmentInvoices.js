import { developmentCustomers } from '../../subscriptions/data/developmentData.js'

const customersById = new Map(developmentCustomers.map((customer) => [customer.id, customer]))

const temporaryInvoiceSeeds = [
  { id: 'INV-2025-1048', customerId: 'demo_customer_cloudmatrix', amount: 4800, status: 'Paid', description: 'Enterprise Plan', date: '2025-05-02', detail: 'Paid via Stripe ACH' },
  { id: 'INV-2025-1047', customerId: 'demo_customer_aether', amount: 2150, status: 'Pending', description: 'Add-on Address', date: '2025-05-03', detail: 'Net 15 terms' },
  { id: 'INV-2025-1046', customerId: 'demo_customer_kestrel', amount: 1600, status: 'Overdue', description: 'Business Monthly', date: '2025-04-29', detail: 'First reminder ignored' },
  { id: 'INV-2025-1045', customerId: 'demo_customer_meridian', amount: 8400, status: 'Draft', description: 'Health platform services', date: '2025-05-04', detail: 'Missing PO number' },
]

export const temporaryDevelopmentInvoices = temporaryInvoiceSeeds.map((seed) => {
  const customer = customersById.get(seed.customerId)
  if (!customer) throw new Error(`Invalid temporary development invoice customer reference for "${seed.id}".`)
  return {
    id: seed.id,
    invoiceNumber: seed.id,
    customerId: customer.id,
    customerName: customer.name,
    subscriptionId: null,
    currency: 'USD',
    status: seed.status,
    issuedAt: seed.date,
    dueAt: seed.date,
    items: [{ description: seed.description, quantity: 1, unitPrice: seed.amount }],
    subtotal: seed.amount,
    discountAmount: 0,
    taxableAmount: seed.amount,
    taxAmount: 0,
    total: seed.amount,
    note: seed.detail,
  }
})

export const developmentInvoices = temporaryDevelopmentInvoices
