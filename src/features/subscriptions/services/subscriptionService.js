import { isSupabaseConfigured } from '../../../services/supabase/client.js'
import { developmentCustomers, developmentPlans, developmentSubscriptions } from '../data/developmentData.js'
import { createSupabaseSubscriptionAdapter } from './supabaseSubscriptionAdapter.js'

let demoSubscriptions = structuredClone(developmentSubscriptions)
let configuredAdapter = null
let supabaseAdapter = null

export class ServiceConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ServiceConfigurationError'
  }
}

export function configureSubscriptionAdapter(adapter) {
  if (!adapter || typeof adapter.list !== 'function' || typeof adapter.getById !== 'function' || typeof adapter.create !== 'function' || typeof adapter.update !== 'function' || typeof adapter.listCustomers !== 'function' || typeof adapter.listPlans !== 'function') {
    throw new TypeError('Subscription adapter must implement list, getById, create, update, listCustomers, and listPlans.')
  }
  configuredAdapter = adapter
}

function getAdapter() {
  if (configuredAdapter) return configuredAdapter
  if (isSupabaseConfigured) return supabaseAdapter ??= createSupabaseSubscriptionAdapter()
  if (!import.meta.env.DEV) {
    throw new ServiceConfigurationError('Supabase is not configured. Subscription demo data is available only in development mode.')
  }

  return {
    async list({ search = '', status = 'all' } = {}) {
      const normalizedSearch = search.trim().toLowerCase()
      return demoSubscriptions.filter((subscription) => {
        const matchesSearch = `${subscription.customerName} ${subscription.planName} ${subscription.id}`.toLowerCase().includes(normalizedSearch)
        const matchesStatus = status === 'all' || subscription.status.toLowerCase() === status.toLowerCase()
        return matchesSearch && matchesStatus
      })
    },
    async getById(id) {
      return demoSubscriptions.find((subscription) => subscription.id === id) ?? null
    },
    async listCustomers() {
      return developmentCustomers
    },
    async listPlans() {
      return developmentPlans
    },
    async create(input) {
      const customer = developmentCustomers.find((item) => item.id === input.customerId)
      const plan = developmentPlans.find((item) => item.id === input.planId)
      if (!customer || !plan) throw new Error('Choose a customer and plan from the available development data.')
      const record = {
        ...input,
        id: `demo_sub_${Date.now()}`,
        customerName: customer.name,
        planName: plan.name,
        currentPeriodStart: input.startDate,
        currentPeriodEnd: input.nextBillingDate,
        status: input.status ?? 'Draft',
      }
      demoSubscriptions = [record, ...demoSubscriptions]
      return record
    },
    async update(id, changes) {
      const currentIndex = demoSubscriptions.findIndex((subscription) => subscription.id === id)
      if (currentIndex < 0) throw new Error(`Subscription "${id}" was not found.`)
      demoSubscriptions = demoSubscriptions.map((subscription) => subscription.id === id ? { ...subscription, ...changes } : subscription)
      return demoSubscriptions[currentIndex] ? { ...demoSubscriptions[currentIndex], ...changes } : null
    },
  }
}

export const subscriptionService = {
  list: (options) => getAdapter().list(options),
  getById: (id) => getAdapter().getById(id),
  listCustomers: () => getAdapter().listCustomers(),
  listPlans: () => getAdapter().listPlans(),
  create: (input) => getAdapter().create(input),
  update: (id, changes) => getAdapter().update(id, changes),
}

export function isUsingDevelopmentSubscriptions() {
  return configuredAdapter === null && import.meta.env.DEV && !isSupabaseConfigured
}

export function resetDevelopmentSubscriptions() {
  demoSubscriptions = structuredClone(developmentSubscriptions)
}
