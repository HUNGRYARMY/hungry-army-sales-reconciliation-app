import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

export interface VarianceThresholdMap {
  // branch_id (or 'global') -> threshold value
  cashVariance: Map<string, number>
  shrinkage: Map<string, number>
}

export function useVarianceThresholds() {
  return useQuery({
    queryKey: ['variance-thresholds'],
    queryFn: async (): Promise<VarianceThresholdMap> => {
      const { data, error } = await supabase.from('variance_thresholds').select('branch_id, metric, threshold_value')
      if (error) throw error
      const cashVariance = new Map<string, number>()
      const shrinkage = new Map<string, number>()
      for (const row of data ?? []) {
        const key = row.branch_id ?? 'global'
        const target = row.metric === 'cash_variance' ? cashVariance : shrinkage
        target.set(key, Number(row.threshold_value))
      }
      return { cashVariance, shrinkage }
    },
  })
}

export function effectiveThreshold(map: Map<string, number>, branchId: string): number | null {
  if (map.has(branchId)) return map.get(branchId)!
  if (map.has('global')) return map.get('global')!
  return null
}

export interface CashVarianceRow {
  branchId: string
  branchName: string
  cashCounted: number | null
  digitalPayments: number | null
  reportedTotal: number | null
  computedGrossSales: number | null
  variance: number | null
  explanation: string | null
  submitted: boolean
}

export function useCashVarianceRows(branchId: string | null, date: string) {
  return useQuery({
    queryKey: ['dashboard-cash-variance', branchId, date],
    queryFn: async (): Promise<CashVarianceRow[]> => {
      const branchesRes = await supabase.from('branches').select('id, name').order('name')
      if (branchesRes.error) throw branchesRes.error
      const branches = (branchesRes.data ?? []).filter((b) => !branchId || b.id === branchId)

      let entriesQuery = supabase
        .from('daily_cash_entry')
        .select('branch_id, cash_counted, digital_payments, reported_total, computed_gross_sales, variance_vs_cash, explanation')
        .eq('date', date)
      if (branchId) entriesQuery = entriesQuery.eq('branch_id', branchId)
      const entriesRes = await entriesQuery
      if (entriesRes.error) throw entriesRes.error
      const byBranch = new Map((entriesRes.data ?? []).map((e: any) => [e.branch_id, e]))

      return branches.map((b) => {
        const e = byBranch.get(b.id)
        return {
          branchId: b.id,
          branchName: b.name,
          cashCounted: e ? Number(e.cash_counted) : null,
          digitalPayments: e ? Number(e.digital_payments) : null,
          reportedTotal: e ? Number(e.reported_total) : null,
          computedGrossSales: e ? Number(e.computed_gross_sales) : null,
          variance: e ? Number(e.variance_vs_cash) : null,
          explanation: e?.explanation ?? null,
          submitted: !!e,
        }
      })
    },
  })
}

export function useInvalidateDashboard() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['dashboard-cash-variance'] })
    qc.invalidateQueries({ queryKey: ['dashboard-shrinkage'] })
    qc.invalidateQueries({ queryKey: ['dashboard-discount-review'] })
    qc.invalidateQueries({ queryKey: ['dashboard-spot-audit'] })
  }
}
