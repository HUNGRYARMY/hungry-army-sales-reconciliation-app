import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'
import type { Branch } from '../../types/domain'

export function useAllBranches() {
  return useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name')
      if (error) throw error
      return data as unknown as Branch[]
    },
  })
}

export interface DeliveryRow {
  id: string
  branchName: string
  productLabel: string
  qty: number
  deliveryTime: string
}

export function useTodayDeliveries() {
  const businessDate = getBusinessDate()
  return useQuery({
    queryKey: ['today-deliveries', businessDate],
    queryFn: async (): Promise<DeliveryRow[]> => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('id, qty, delivery_time, branches(name), products(flavor_name, size)')
        .eq('date', businessDate)
        .order('delivery_time', { ascending: false })
      if (error) throw error
      return (data ?? []).map((r: any) => ({
        id: r.id,
        branchName: r.branches?.name ?? 'Branch',
        productLabel: r.products ? `${r.products.flavor_name} (${r.products.size})` : 'Product',
        qty: r.qty,
        deliveryTime: r.delivery_time,
      }))
    },
  })
}

export function useInvalidateTodayDeliveries() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['today-deliveries'] })
}
