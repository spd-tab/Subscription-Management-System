
import { supabase, isSupabaseConfigured } from './supabase/client'

function checkSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured. Check your .env file.')
  }
}

/**
 * Fetch all customers.
 */
export async function fetchCustomers() {
  checkSupabase()

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Fetch one customer.
 */
export async function fetchCustomerById(id) {
  checkSupabase()

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a customer.
 */
export async function createCustomer({
  name,
  email,
  phone,
  billing_address,
}) {
  checkSupabase()

  const payload = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    billing_address: billing_address?.trim() || null,
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing customer.
 */
export async function updateCustomer(id, updates) {
  checkSupabase()

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  if (payload.name !== undefined) payload.name = payload.name.trim()
  if (payload.email !== undefined) {
    payload.email = payload.email.trim().toLowerCase()
  }
  if (payload.phone !== undefined) {
    payload.phone = payload.phone?.trim() || null
  }
  if (payload.billing_address !== undefined) {
    payload.billing_address = payload.billing_address?.trim() || null
  }

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
