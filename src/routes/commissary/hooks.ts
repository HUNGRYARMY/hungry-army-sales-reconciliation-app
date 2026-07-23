import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'

export { useAllBranches } from '../../lib/queries/branches'

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
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        branchName: r.branches?.name ?? 'Branch',
        productLabel: r.products ? `${r.products.flavor_name} (${r.products.size})` : 'Product',
        qty: r.qty,
        deliveryTime: r.delivery_time,
      }))
      // Grouped by branch (alphabetical) instead of interleaved by time, so all of one branch's
      // deliveries sit together; most recent first within each branch.
      return rows.sort((a, b) => {
        if (a.branchName !== b.branchName) return a.branchName.localeCompare(b.branchName)
        return b.deliveryTime.localeCompare(a.deliveryTime)
      })
    },
  })
}

export function useInvalidateTodayDeliveries() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['today-deliveries'] })
}

export interface ProductDeliveryGroup {
  productLabel: string
  entries: DeliveryRow[] // oldest first, so "1st delivery"/"2nd delivery" numbering reads naturally
  total: number
}

export interface BranchDeliveryGroup {
  branchName: string
  products: ProductDeliveryGroup[]
}

// Same flavor delivered more than once in a day (e.g. a top-up run) showed as separate, unrelated-looking
// rows. Nests deliveries branch -> product so repeat deliveries of one flavor stack together with a total.
export function groupDeliveriesByBranchAndProduct(rows: DeliveryRow[]): BranchDeliveryGroup[] {
  const byBranch = new Map<string, Map<string, DeliveryRow[]>>()
  for (const r of rows) {
    if (!byBranch.has(r.branchName)) byBranch.set(r.branchName, new Map())
    const byProduct = byBranch.get(r.branchName)!
    if (!byProduct.has(r.productLabel)) byProduct.set(r.productLabel, [])
    byProduct.get(r.productLabel)!.push(r)
  }

  return Array.from(byBranch.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([branchName, byProduct]) => ({
      branchName,
      products: Array.from(byProduct.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([productLabel, entries]) => {
          const ordered = [...entries].sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
          return { productLabel, entries: ordered, total: ordered.reduce((sum, e) => sum + e.qty, 0) }
        }),
    }))
}
