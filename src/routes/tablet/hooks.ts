import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'
import type { Product, Promo, Bundle } from '../../types/domain'

export function useActiveProducts() {
  return useQuery({
    queryKey: ['products', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('flavor_name')
        .order('size')
      if (error) throw error
      return data as unknown as Product[]
    },
  })
}

export function useActivePromos() {
  return useQuery({
    queryKey: ['promos', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('promos').select('*').eq('status', 'active').order('name')
      if (error) throw error
      return data as unknown as Promo[]
    },
  })
}

export function useActiveBundles() {
  return useQuery({
    queryKey: ['bundles', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bundles').select('*').eq('status', 'active').order('name')
      if (error) throw error
      return data as unknown as Bundle[]
    },
  })
}

export interface RecentTallyRow {
  id: string
  kind: 'sale' | 'bundle'
  label: string
  qty: number
  discountType?: string
  timestamp: string
  isVoid: boolean
}

export function useTodayActivity(branchId: string | null) {
  const businessDate = getBusinessDate()
  return useQuery({
    queryKey: ['today-activity', branchId, businessDate],
    enabled: !!branchId,
    queryFn: async (): Promise<RecentTallyRow[]> => {
      const [sales, bundles] = await Promise.all([
        supabase
          .from('sale_tally')
          .select('id, qty_sold, discount_type, timestamp, is_void, products(flavor_name, size)')
          .eq('branch_id', branchId!)
          .eq('date', businessDate)
          .order('timestamp', { ascending: false })
          .limit(30),
        supabase
          .from('bundle_sale')
          .select('id, qty_bundles_sold, timestamp, is_void, bundles(name)')
          .eq('branch_id', branchId!)
          .eq('date', businessDate)
          .order('timestamp', { ascending: false })
          .limit(30),
      ])
      if (sales.error) throw sales.error
      if (bundles.error) throw bundles.error

      const saleRows: RecentTallyRow[] = (sales.data ?? []).map((r: any) => ({
        id: r.id,
        kind: 'sale',
        label: r.products ? `${r.products.flavor_name} (${r.products.size})` : 'Product',
        qty: r.qty_sold,
        discountType: r.discount_type,
        timestamp: r.timestamp,
        isVoid: r.is_void,
      }))
      const bundleRows: RecentTallyRow[] = (bundles.data ?? []).map((r: any) => ({
        id: r.id,
        kind: 'bundle',
        label: r.bundles ? r.bundles.name : 'Bundle',
        qty: r.qty_bundles_sold,
        timestamp: r.timestamp,
        isVoid: r.is_void,
      }))

      return [...saleRows, ...bundleRows].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 30)
    },
  })
}

export function useInvalidateTodayActivity() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['today-activity'] })
}
