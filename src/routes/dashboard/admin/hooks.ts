import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { getBusinessDate } from '../../../lib/businessDate'
import type { Branch, Product, ProductSize, CatalogStatus, Promo, Bundle } from '../../../types/domain'

export function useAllBranchesAdmin() {
  return useQuery({
    queryKey: ['admin-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name')
      if (error) throw error
      return data as unknown as Branch[]
    },
  })
}

export async function insertBranch(input: { name: string; closing_time: string | null }) {
  const { error } = await supabase.from('branches').insert(input)
  if (error) throw error
}

export async function updateBranch(id: string, patch: Partial<{ name: string; closing_time: string | null; is_active: boolean }>) {
  const { error } = await supabase.from('branches').update(patch).eq('id', id)
  if (error) throw error
}

export interface ProductWithPrice extends Product {
  currentPrice: number | null
}

export function useAllProductsAdmin() {
  return useQuery({
    queryKey: ['admin-products'],
    queryFn: async (): Promise<ProductWithPrice[]> => {
      const productsRes = await supabase.from('products').select('*').order('flavor_name').order('size')
      if (productsRes.error) throw productsRes.error

      const today = getBusinessDate()
      const pricesRes = await supabase
        .from('price_history')
        .select('product_id, price, effective_date')
        .lte('effective_date', today)
        .order('effective_date', { ascending: false })
      if (pricesRes.error) throw pricesRes.error

      const latestByProduct = new Map<string, number>()
      for (const p of pricesRes.data ?? []) {
        if (!latestByProduct.has(p.product_id)) latestByProduct.set(p.product_id, Number(p.price))
      }

      return (productsRes.data as unknown as Product[]).map((p) => ({
        ...p,
        currentPrice: latestByProduct.get(p.id) ?? null,
      }))
    },
  })
}

export async function insertProduct(input: { flavor_name: string; size: ProductSize }) {
  const { error } = await supabase.from('products').insert(input)
  if (error) throw error
}

export async function updateProductStatus(id: string, status: CatalogStatus) {
  const { error } = await supabase.from('products').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateProductName(id: string, flavor_name: string) {
  const { error } = await supabase.from('products').update({ flavor_name }).eq('id', id)
  if (error) throw error
}

export async function insertPrice(input: { product_id: string; price: number; effective_date: string }) {
  const { error } = await supabase.from('price_history').insert(input)
  if (error) throw error
}

export function useAllPromosAdmin() {
  return useQuery({
    queryKey: ['admin-promos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('promos').select('*').order('name')
      if (error) throw error
      return data as unknown as Promo[]
    },
  })
}

export async function insertPromo(input: { name: string; rate: number }) {
  const { error } = await supabase.from('promos').insert(input)
  if (error) throw error
}

export async function updatePromoStatus(id: string, status: CatalogStatus) {
  const { error } = await supabase.from('promos').update({ status }).eq('id', id)
  if (error) throw error
}

export function useAllBundlesAdmin() {
  return useQuery({
    queryKey: ['admin-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bundles').select('*').order('name')
      if (error) throw error
      return data as unknown as Bundle[]
    },
  })
}

export async function insertBundle(input: { name: string; price: number }) {
  const { error } = await supabase.from('bundles').insert(input)
  if (error) throw error
}

export async function updateBundleStatus(id: string, status: CatalogStatus) {
  const { error } = await supabase.from('bundles').update({ status }).eq('id', id)
  if (error) throw error
}

export interface BundleComponentRow {
  id: string
  productId: string
  productLabel: string
  qtyPerBundle: number
}

export function useBundleComponents(bundleId: string | null) {
  return useQuery({
    queryKey: ['admin-bundle-components', bundleId],
    enabled: !!bundleId,
    queryFn: async (): Promise<BundleComponentRow[]> => {
      const { data, error } = await supabase
        .from('bundle_components')
        .select('id, product_id, qty_per_bundle, products(flavor_name, size)')
        .eq('bundle_id', bundleId!)
      if (error) throw error
      return (data ?? []).map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        productLabel: r.products ? `${r.products.flavor_name} (${r.products.size})` : 'Product',
        qtyPerBundle: r.qty_per_bundle,
      }))
    },
  })
}

export async function insertBundleComponent(input: { bundle_id: string; product_id: string; qty_per_bundle: number }) {
  const { error } = await supabase.from('bundle_components').insert(input)
  if (error) throw error
}

export async function updateBundleComponentQty(id: string, qty_per_bundle: number) {
  const { error } = await supabase.from('bundle_components').update({ qty_per_bundle }).eq('id', id)
  if (error) throw error
}

export interface DiscountSettingRow {
  discount_type: string
  rate: number
  description: string | null
}

export function useDiscountSettings() {
  return useQuery({
    queryKey: ['admin-discount-settings'],
    queryFn: async (): Promise<DiscountSettingRow[]> => {
      const { data, error } = await supabase.from('discount_settings').select('*').order('discount_type')
      if (error) throw error
      return (data ?? []).map((r: any) => ({ discount_type: r.discount_type, rate: Number(r.rate), description: r.description }))
    },
  })
}

export async function updateDiscountRate(discount_type: string, rate: number) {
  const { error } = await supabase.from('discount_settings').update({ rate }).eq('discount_type', discount_type)
  if (error) throw error
}

export interface ThresholdRow {
  id: string
  branch_id: string | null
  branch_name: string | null
  metric: 'cash_variance' | 'shrinkage'
  threshold_value: number
}

export function useAllThresholdsAdmin() {
  return useQuery({
    queryKey: ['admin-thresholds'],
    queryFn: async (): Promise<ThresholdRow[]> => {
      const { data, error } = await supabase
        .from('variance_thresholds')
        .select('id, branch_id, metric, threshold_value, branches(name)')
        .order('metric')
      if (error) throw error
      return (data ?? []).map((r: any) => ({
        id: r.id,
        branch_id: r.branch_id,
        branch_name: r.branches?.name ?? null,
        metric: r.metric,
        threshold_value: Number(r.threshold_value),
      }))
    },
  })
}

export async function upsertThreshold(branch_id: string | null, metric: 'cash_variance' | 'shrinkage', threshold_value: number) {
  let q = supabase.from('variance_thresholds').select('id').eq('metric', metric)
  q = branch_id ? q.eq('branch_id', branch_id) : q.is('branch_id', null)
  const { data: existing, error: selErr } = await q.maybeSingle()
  if (selErr) throw selErr
  if (existing) {
    const { error } = await supabase.from('variance_thresholds').update({ threshold_value }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('variance_thresholds').insert({ branch_id, metric, threshold_value })
    if (error) throw error
  }
}

export async function deleteThreshold(id: string) {
  const { error } = await supabase.from('variance_thresholds').delete().eq('id', id)
  if (error) throw error
}

export function useInvalidateAdmin() {
  const qc = useQueryClient()
  return (key: string) => qc.invalidateQueries({ queryKey: [key] })
}
