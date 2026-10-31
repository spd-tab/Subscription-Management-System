export const customers = [
  { id: 'cus_001', name: 'Starlight AI Technologies', contact: 'Dr. Elena Vance', email: 'elena@starlight.ai', phone: '+1 (415) 890-2133', region: 'United States', added: 'Jan 2023', plan: 'Enterprise Dedicated', subscriptions: 1, mrr: 2000, invoices: '14 Paid • 0 Overdue', status: 'Healthy', segment: 'Enterprise' },
  { id: 'cus_002', name: 'Acme Corporation', contact: 'Marcus Sterling', email: 'm.sterling@acme.com', phone: '+1 (212) 555-0199', region: 'United States', added: 'Nov 2022', plan: 'Growth Annual', subscriptions: 2, mrr: 3800, invoices: '28 Paid • 1 Pending', status: 'Healthy', segment: 'Enterprise' },
  { id: 'cus_003', name: 'Kestrel Logistics Ltd', contact: 'Sarah Jenkins', email: 'billing@kestrellogistics.co.uk', phone: '+44 20 7946 0912', region: 'United Kingdom', added: 'Jul 2023', plan: 'Business Monthly', subscriptions: 1, mrr: 1600, invoices: '6 Paid • 1 Overdue ($1,600)', status: 'Payment Issue', segment: 'SMB' },
  { id: 'cus_004', name: 'Crestview Capital', contact: 'Julian Thorne', email: 'j.thorne@crestview.com', phone: '+1 (312) 441-9080', region: 'United States', added: 'Feb 2024', plan: 'Standard Cloud', subscriptions: 1, mrr: 750, invoices: '8 Paid • 0 Overdue', status: 'Healthy', segment: 'SMB' },
]

export const subscriptions = [
  { id: 'sub_001', customer: customers[0].name, plan: 'Enterprise Dedicated', billing: 'Annual', amount: 24000, monthly: 2000, renews: 'Oct 14, 2025', status: 'Active', note: 'Auto-renew ON' },
  { id: 'sub_002', customer: 'HyperScale Data Co.', plan: 'Scale Tier · Monthly (10 seats)', billing: 'Monthly', amount: 850, monthly: 850, renews: 'Jun 01, 2025', status: 'Active', note: '10 seats included' },
  { id: 'sub_003', customer: 'Vanguard Dynamics', plan: 'Growth Tier · Quarterly', billing: 'Quarterly', amount: 1290, monthly: 430, renews: 'Jun 04, 2025', status: 'Quotation', note: 'Expires in 4 days • Needs signature' },
  { id: 'sub_004', customer: 'Nexus Robotics GmbH', plan: 'Standard Cloud · Monthly', billing: 'Monthly', amount: 320, monthly: 320, renews: 'Paused Apr 28', status: 'Paused', note: 'Paused by Admin' },
]

export const invoices = [
  { id: 'INV-2025-1048', customer: 'CloudMatrix Global', initials: 'CM', amount: 4800, status: 'Paid', detail: 'Issued May 02, 2025 • Paid via Stripe ACH', plan: 'Enterprise Plan', date: 'May 02, 2025' },
  { id: 'INV-2025-1047', customer: 'Aether BioSystems', initials: 'AB', amount: 2150, status: 'Pending', detail: 'Net 15 terms • Sent May 03', plan: 'Add-on Address', date: 'May 03, 2025' },
  { id: 'INV-2025-1046', customer: 'Kestrel Logistics Ltd', initials: 'KL', amount: 1600, status: 'Overdue', detail: 'Due Apr 29, 2025 • First reminder ignored', plan: '2x Dunning Sent', date: 'Apr 29, 2025' },
  { id: 'INV-2025-1045', customer: 'Meridian Health', initials: 'MH', amount: 8400, status: 'Draft', detail: 'Created May 04 • Unsent • Missing PO number', plan: 'Needs Review', date: 'May 04, 2025' },
]

export const payments = [
  { id: 'PAY-9012', customer: 'Acme Corporation', amount: 2400, status: 'Paid', method: 'Visa ending 4242', date: 'May 04, 2025' },
  { id: 'PAY-9011', customer: 'Linearflow Inc', amount: 490, status: 'Confirmed', method: 'ACH transfer', date: 'May 03, 2025' },
  { id: 'PAY-9010', customer: 'Nordic Labs', amount: 1150, status: 'Pending', method: 'Wire transfer', date: 'May 02, 2025' },
  { id: 'PAY-9009', customer: 'Vertex Systems', amount: 3600, status: 'Paid', method: 'Wire transfer', date: 'May 01, 2025' },
]

export const dashboardStats = [
  { label: 'MRR run-rate', value: '$148,250', delta: '+12.4%', icon: 'trend' },
  { label: 'Active subs', value: '1,842', delta: '+64 new', icon: 'users' },
  { label: 'Outstanding', value: '$18,490', delta: '8 pending', icon: 'clock' },
  { label: 'Overdue', value: '$3,200', delta: '2 overdue', icon: 'alert', tone: 'danger' },
]

export const moduleData = {
  products: { columns: ['Product', 'Category', 'Variants', 'Status'], rows: [['Brightloop Analytics', 'Software', '3 variants', 'Active'], ['Workflow Studio', 'Productivity', '2 variants', 'Active'], ['Data Connect', 'Integration', '5 variants', 'Draft']] },
  plans: { columns: ['Plan', 'Billing', 'Price', 'Subscribers'], rows: [['Starter', 'Monthly', '$29 / mo', '642'], ['Growth', 'Monthly', '$79 / mo', '814'], ['Enterprise', 'Annual', 'Custom', '386']] },
  quotations: { columns: ['Quote', 'Customer', 'Amount', 'Status'], rows: [['QT-2025-208', 'Vanguard Dynamics', '$1,290', 'Sent'], ['QT-2025-207', 'Meridian Health', '$8,400', 'Draft'], ['QT-2025-206', 'Acme Corporation', '$3,800', 'Accepted']] },
  discounts: { columns: ['Code', 'Type', 'Value', 'Status'], rows: [['WELCOME20', 'Percentage', '20%', 'Active'], ['ANNUAL10', 'Percentage', '10%', 'Active'], ['SPRING500', 'Fixed amount', '$500', 'Scheduled']] },
  taxes: { columns: ['Region', 'Tax name', 'Rate', 'Status'], rows: [['United States', 'Sales tax', 'Varies by state', 'Active'], ['United Kingdom', 'VAT', '20%', 'Active'], ['European Union', 'VAT', 'Varies by country', 'Active']] },
  team: { columns: ['Team member', 'Role', 'Last active', 'Status'], rows: [['Elena Rodriguez', 'Administrator', 'Just now', 'Active'], ['Jordan Lee', 'Billing manager', '2 hours ago', 'Active'], ['Sam Patel', 'Analyst', 'Yesterday', 'Invited']] },
  reports: { columns: ['Report', 'Period', 'Last updated', ''], rows: [['Monthly recurring revenue', 'May 2025', 'May 04, 2025', 'View'], ['Revenue retention', 'Q1 2025', 'Apr 30, 2025', 'View'], ['Customer growth', 'May 2025', 'May 04, 2025', 'View']] },
}
