import { supabase, isSupabaseConfigured } from './supabase/client'

/**
 * Fetch all products with their associated variants from Supabase.
 */
export async function fetchProducts() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured. Check your .env file.')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Fetch a single product by its UUID, including all variants.
 */
export async function fetchProductById(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new product.
 */
export async function createProduct({ name, type, sales_price, cost_price, notes, is_active = true }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const payload = {
    name: name.trim(),
    type: type?.trim() || 'Software',
    sales_price: Number(sales_price) || 0,
    cost_price: Number(cost_price) || 0,
    notes: notes?.trim() || null,
    is_active: Boolean(is_active),
  }

  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select('*, product_variants(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing product.
 */
export async function updateProduct(id, updates) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  if (payload.sales_price !== undefined) payload.sales_price = Number(payload.sales_price) || 0
  if (payload.cost_price !== undefined) payload.cost_price = Number(payload.cost_price) || 0

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select('*, product_variants(*)')
    .single()

  if (error) throw error
  return data
}

/**
 * Toggle a product's active status.
 */
export async function toggleProductStatus(id, currentStatus) {
  return updateProduct(id, { is_active: !currentStatus })
}

/**
 * Create a new variant for a product.
 */
export async function createVariant({ product_id, name, price_modifier = 0, is_active = true }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const payload = {
    product_id,
    name: name.trim(),
    price_modifier: Number(price_modifier) || 0,
    is_active: Boolean(is_active),
  }

  const { data, error } = await supabase
    .from('product_variants')
    .insert([payload])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a variant.
 */
export async function updateVariant(variantId, updates) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const payload = { ...updates }
  if (payload.price_modifier !== undefined) {
    payload.price_modifier = Number(payload.price_modifier) || 0
  }

  const { data, error } = await supabase
    .from('product_variants')
    .update(payload)
    .eq('id', variantId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Toggle a variant's active status.
 */
export async function toggleVariantStatus(variantId, currentStatus) {
  return updateVariant(variantId, { is_active: !currentStatus })
}

/**
 * Delete a variant (if not referenced in historical plan items).
 */
export async function deleteVariant(variantId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)

  if (error) throw error
  return true
}
