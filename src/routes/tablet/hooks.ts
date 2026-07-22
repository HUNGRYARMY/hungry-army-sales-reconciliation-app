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

// product_id -> true once a disposition row exists for that branch/product/today (unique(branch_id,
// product_id, date) means a second insert would just fail — the UI uses this to lock the row instead).
export function useTodayDispositionStatus(branchId: string | null) {
  const businessDate = getBusinessDate()
  return useQuery({
    queryKey: ['today-disposition-status', branchId, businessDate],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('end_of_day_disposition')
        .select('product_id')
        .eq('branch_id', branchId!)
        .eq('date', businessDate)
      if (error) throw error
      return new Set((data ?? []).map((r: any) => r.product_id as string))
    },
  })
}

export function useInvalidateTodayDispositionStatus() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['today-disposition-status'] })
}

export interface CashEntrySummary {
  cash_counted: number
  digital_payments: number
  computed_gross_sales: number
  variance_vs_cash: number
  explanation: string | null
}

export function useTodayCashEntry(branchId: string | null) {
  const businessDate = getBusinessDate()
  return useQuery({
    queryKey: ['today-cash-entry', branchId, businessDate],
    enabled: !!branchId,
    queryFn: async (): Promise<CashEntrySummary | null> => {
      const { data, error } = await supabase
        .from('daily_cash_entry')
        .select('cash_counted, digital_payments, computed_gross_sales, variance_vs_cash, explanation')
        .eq('branch_id', branchId!)
        .eq('date', businessDate)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as CashEntrySummary) ?? null
    },
  })
}

export function useInvalidateTodayCashEntry() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['today-cash-entry'] })
}
