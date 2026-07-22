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

export interface ShrinkageRow {
  branchId: string
  branchName: string
  productId: string
  productLabel: string
  carryoverIn: number | null
  shippedIn: number | null
  available: number | null
  sold: number | null
  wasted: number | null
  carryoverOut: number | null
  variance: number | null
  explanation: string | null
  closed: boolean
}

export function useShrinkageRows(branchId: string | null, date: string) {
  return useQuery({
    queryKey: ['dashboard-shrinkage', branchId, date],
    queryFn: async (): Promise<ShrinkageRow[]> => {
      const branchesRes = await supabase.from('branches').select('id, name').order('name')
      if (branchesRes.error) throw branchesRes.error
      const branches = (branchesRes.data ?? []).filter((b) => !branchId || b.id === branchId)

      const productsRes = await supabase
        .from('products')
        .select('id, flavor_name, size')
        .eq('status', 'active')
        .order('flavor_name')
        .order('size')
      if (productsRes.error) throw productsRes.error

      let ledgerQuery = supabase
        .from('daily_product_ledger')
        .select('branch_id, product_id, carryover_in, shipped_in, available, sold, wasted, carryover_out, unexplained_variance, explanation')
        .eq('date', date)
      if (branchId) ledgerQuery = ledgerQuery.eq('branch_id', branchId)
      const ledgerRes = await ledgerQuery
      if (ledgerRes.error) throw ledgerRes.error
      const byKey = new Map((ledgerRes.data ?? []).map((l: any) => [`${l.branch_id}:${l.product_id}`, l]))

      const rows: ShrinkageRow[] = []
      for (const b of branches) {
        for (const p of productsRes.data ?? []) {
          const l = byKey.get(`${b.id}:${p.id}`)
          rows.push({
            branchId: b.id,
            branchName: b.name,
            productId: p.id,
            productLabel: `${p.flavor_name} (${p.size})`,
            carryoverIn: l ? l.carryover_in : null,
            shippedIn: l ? l.shipped_in : null,
            available: l ? l.available : null,
            sold: l ? l.sold : null,
            wasted: l ? l.wasted : null,
            carryoverOut: l ? l.carryover_out : null,
            variance: l ? l.unexplained_variance : null,
            explanation: l?.explanation ?? null,
            closed: !!l,
          })
        }
      }
      return rows
    },
  })
}

export interface DiscountReviewRow {
  id: string
  branchName: string
  productLabel: string
  qtySold: number
  manualDiscountRate: number | null
  discountReason: string | null
  enteredByName: string
  timestamp: string
}

export function useDiscountReviewRows(branchId: string | null) {
  return useQuery({
    queryKey: ['dashboard-discount-review', branchId],
    queryFn: async (): Promise<DiscountReviewRow[]> => {
      let q = supabase
        .from('sale_tally')
        .select(
          'id, qty_sold, manual_discount_rate, discount_reason, timestamp, branches(name), products(flavor_name, size), profiles!sale_tally_entered_by_fkey(full_name)',
        )
        .eq('needs_review', true)
        .order('timestamp', { ascending: false })
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map((r: any) => ({
        id: r.id,
        branchName: r.branches?.name ?? 'Branch',
        productLabel: r.products ? `${r.products.flavor_name} (${r.products.size})` : 'Product',
        qtySold: r.qty_sold,
        manualDiscountRate: r.manual_discount_rate !== null ? Number(r.manual_discount_rate) : null,
        discountReason: r.discount_reason,
        enteredByName: r.profiles?.full_name ?? 'Unknown',
        timestamp: r.timestamp,
      }))
    },
  })
}

export async function markDiscountReviewed(id: string, notes: string | null) {
  const { error } = await supabase.rpc('mark_discount_reviewed', { p_id: id, p_notes: notes })
  if (error) throw error
}

export interface SpotAuditRow {
  id: string
  date: string
  branchName: string
  countedAmount: number
  comparedToSubmitted: number | null
  variance: number | null
  notes: string | null
}

export function useSpotAuditRows(branchId: string | null) {
  return useQuery({
    queryKey: ['dashboard-spot-audit', branchId],
    queryFn: async (): Promise<SpotAuditRow[]> => {
      let q = supabase
        .from('spot_audit')
        .select('id, date, counted_amount, compared_to_submitted, variance, notes, branches(name)')
        .order('date', { ascending: false })
        .limit(50)
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map((r: any) => ({
        id: r.id,
        date: r.date,
        branchName: r.branches?.name ?? 'Branch',
        countedAmount: Number(r.counted_amount),
        comparedToSubmitted: r.compared_to_submitted !== null ? Number(r.compared_to_submitted) : null,
        variance: r.variance !== null ? Number(r.variance) : null,
        notes: r.notes,
      }))
    },
  })
}

export async function fetchSubmittedTotal(branchId: string, date: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('daily_cash_entry')
    .select('reported_total')
    .eq('branch_id', branchId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw error
  return data ? Number(data.reported_total) : null
}

export async function insertSpotAudit(input: {
  date: string
  branch_id: string
  counted_amount: number
  compared_to_submitted: number | null
  notes: string | null
  performed_by: string
}) {
  const { error } = await supabase.from('spot_audit').insert(input)
  if (error) throw error
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
