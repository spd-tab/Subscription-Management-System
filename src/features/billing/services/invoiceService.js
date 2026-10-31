import { isSupabaseConfigured } from '../../../services/supabase/client.js'
import { getLocalDateOnly } from './calculationUtils.js'
import { developmentInvoices } from '../data/developmentInvoices.js'

let demoInvoices = structuredClone(developmentInvoices)
let configuredAdapter = null

export function configureInvoiceAdapter(adapter) {
  if (!adapter || typeof adapter.list !== 'function' || typeof adapter.getById !== 'function' || typeof adapter.createDraft !== 'function') {
    throw new TypeError('Invoice adapter must implement list, getById, and createDraft.')
  }
  configuredAdapter = adapter
}

function getAdapter() {
  if (configuredAdapter) return configuredAdapter
  if (isSupabaseConfigured) {
    throw new Error('Supabase is configured, but an invoice adapter must be supplied for the agreed database schema.')
  }
  return {
    async list({ search = '', status = 'all' } = {}) {
      const normalizedSearch = search.trim().toLowerCase()
      return demoInvoices.filter((invoice) => {
        const matchesSearch = `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase().includes(normalizedSearch)
        const matchesStatus = status === 'all' || invoice.status.toLowerCase() === status.toLowerCase()
        return matchesSearch && matchesStatus
      })
    },
    async getById(id) {
      return demoInvoices.find((invoice) => invoice.id === id || invoice.invoiceNumber === id) ?? null
    },
    async createDraft(input) {
      const record = {
        ...input,
        id: `demo_inv_${Date.now()}`,
        invoiceNumber: `DEMO-${Date.now()}`,
        status: 'Draft',
        issuedAt: getLocalDateOnly(),
      }
      demoInvoices = [record, ...demoInvoices]
      return record
    },
  }
}

export const invoiceService = {
  list: (options) => getAdapter().list(options),
  getById: (id) => getAdapter().getById(id),
  createDraft: (input) => getAdapter().createDraft(input),
  requestGeneration(payload) {
    const adapter = getAdapter()
    if (typeof adapter.requestGeneration !== 'function') {
      throw new Error('Automatic invoice generation requires the agreed atomic Supabase RPC or trusted server-side operation.')
    }
    return adapter.requestGeneration(payload)
  },
}

export function isUsingDevelopmentInvoices() {
  return configuredAdapter === null && !isSupabaseConfigured
}

export function resetDevelopmentInvoices() {
  demoInvoices = structuredClone(developmentInvoices)
}
