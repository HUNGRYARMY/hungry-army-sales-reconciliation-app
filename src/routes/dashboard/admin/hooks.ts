import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { getBusinessDate } from '../../../lib/businessDate'
import type { Branch, Product, ProductSize, CatalogStatus, Promo } from '../../../types/domain'

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

export function useInvalidateAdmin() {
  const qc = useQueryClient()
  return (key: string) => qc.invalidateQueries({ queryKey: [key] })
}
