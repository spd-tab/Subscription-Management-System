export const developmentCustomers = [
  { id: 'demo_customer_starlight', name: 'Starlight AI Technologies', email: 'elena@starlight.ai' },
  { id: 'demo_customer_acme', name: 'Acme Corporation', email: 'm.sterling@acme.com' },
  { id: 'demo_customer_kestrel', name: 'Kestrel Logistics Ltd', email: 'billing@kestrellogistics.co.uk' },
  { id: 'demo_customer_crestview', name: 'Crestview Capital', email: 'j.thorne@crestview.com' },
  { id: 'demo_customer_hyperscale', name: 'HyperScale Data Co.', email: 'billing@hyperscale.example' },
  { id: 'demo_customer_vanguard', name: 'Vanguard Dynamics', email: 'accounts@vanguard.example' },
  { id: 'demo_customer_nexus', name: 'Nexus Robotics GmbH', email: 'finance@nexus.example' },
  { id: 'demo_customer_cloudmatrix', name: 'CloudMatrix Global', email: 'billing@cloudmatrix.example' },
  { id: 'demo_customer_aether', name: 'Aether BioSystems', email: 'finance@aether.example' },
  { id: 'demo_customer_meridian', name: 'Meridian Health', email: 'accounts@meridian.example' },
]

export const developmentPlans = [
  { id: 'demo_plan_enterprise_dedicated', name: 'Enterprise Dedicated', unitPrice: 24000, currency: 'USD', billingFrequency: 'yearly', billingInterval: 1 },
  { id: 'demo_plan_growth_annual', name: 'Growth Annual', unitPrice: 45600, currency: 'USD', billingFrequency: 'yearly', billingInterval: 1 },
  { id: 'demo_plan_business_monthly', name: 'Business Monthly', unitPrice: 1600, currency: 'USD', billingFrequency: 'monthly', billingInterval: 1 },
  { id: 'demo_plan_standard_cloud', name: 'Standard Cloud', unitPrice: 750, currency: 'USD', billingFrequency: 'monthly', billingInterval: 1 },
  { id: 'demo_plan_scale_monthly', name: 'Scale Tier', unitPrice: 850, currency: 'USD', billingFrequency: 'monthly', billingInterval: 1 },
  { id: 'demo_plan_growth_quarterly', name: 'Growth Tier', unitPrice: 1290, currency: 'USD', billingFrequency: 'monthly', billingInterval: 3 },
]

const customerById = new Map(developmentCustomers.map((customer) => [customer.id, customer]))
const planById = new Map(developmentPlans.map((plan) => [plan.id, plan]))

const subscriptionSeeds = [
  { id: 'sub_001', customerId: 'demo_customer_starlight', planId: 'demo_plan_enterprise_dedicated', startDate: '2024-10-14', nextBillingDate: '2025-10-14', status: 'Active', note: 'Auto-renew ON' },
  { id: 'sub_002', customerId: 'demo_customer_hyperscale', planId: 'demo_plan_scale_monthly', startDate: '2025-05-01', nextBillingDate: '2025-06-01', status: 'Active', note: '10 seats included' },
  { id: 'sub_003', customerId: 'demo_customer_vanguard', planId: 'demo_plan_growth_quarterly', startDate: '2025-03-04', nextBillingDate: '2025-06-04', status: 'Quotation', note: 'Expires in 4 days • Needs signature' },
  { id: 'sub_004', customerId: 'demo_customer_nexus', planId: 'demo_plan_standard_cloud', startDate: '2025-04-28', nextBillingDate: '2025-05-28', status: 'Paused', note: 'Paused by Admin' },
]

export const temporaryDevelopmentSubscriptions = subscriptionSeeds.map((seed) => {
  const customer = customerById.get(seed.customerId)
  const plan = planById.get(seed.planId)

  if (!customer || !plan) throw new Error(`Invalid temporary development subscription references for "${seed.id}".`)

  return {
    ...seed,
    customerName: customer.name,
    planName: plan.name,
    quantity: 1,
    unitPrice: plan.unitPrice,
    currency: plan.currency,
    billingFrequency: plan.billingFrequency,
    billingInterval: plan.billingInterval,
    expiryDate: null,
    currentPeriodStart: seed.startDate,
    currentPeriodEnd: seed.nextBillingDate,
  }
})

export const developmentSubscriptions = temporaryDevelopmentSubscriptions
