import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { ProductSize } from '../../types/domain'

export interface BranchRef {
  id: string
  name: string
}

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

export interface CashVarianceEntry {
  cashCounted: number
  digitalPayments: number
  reportedTotal: number
  computedGrossSales: number
  variance: number
  explanation: string | null
}

// Returns entries keyed by branch_id only — no branch name/order baked in. The view combines this with
// the live branches list (from the shared useAllBranches() hook) at render time. Baking branch info into
// this query's cached result was the actual bug: React Query caches whatever a queryFn returns, so a
// branch rename/reorder wouldn't change already-cached rows until this exact query key was invalidated or
// refetched — invalidating the branches list elsewhere doesn't touch a value that's frozen inside a
// different cache entry. Keeping branch data out of here entirely means there's nothing to go stale.
export function useCashVarianceEntries(branchId: string | null, date: string) {
  return useQuery({
    queryKey: ['dashboard-cash-variance', branchId, date],
    queryFn: async (): Promise<Map<string, CashVarianceEntry>> => {
      let entriesQuery = supabase
        .from('daily_cash_entry')
        .select('branch_id, cash_counted, digital_payments, reported_total, computed_gross_sales, variance_vs_cash, explanation')
        .eq('date', date)
      if (branchId) entriesQuery = entriesQuery.eq('branch_id', branchId)
      const entriesRes = await entriesQuery
      if (entriesRes.error) throw entriesRes.error
      const map = new Map<string, CashVarianceEntry>()
      for (const e of entriesRes.data ?? []) {
        map.set(e.branch_id, {
          cashCounted: Number(e.cash_counted),
          digitalPayments: Number(e.digital_payments),
          reportedTotal: Number(e.reported_total),
          computedGrossSales: Number(e.computed_gross_sales),
          variance: Number(e.variance_vs_cash),
          explanation: e.explanation ?? null,
        })
      }
      return map
    },
  })
}

export interface ShrinkageProduct {
  id: string
  label: string
}

export interface ShrinkageEntry {
  carryoverIn: number
  shippedIn: number
  available: number
  sold: number
  wasted: number
  carryoverOut: number
  variance: number
  explanation: string | null
}

export interface ShrinkageData {
  products: ShrinkageProduct[]
  entriesByKey: Map<string, ShrinkageEntry> // `${branchId}:${productId}`
}

// Same reasoning as useCashVarianceEntries: branches stay out of this query's cached result so the view
// can combine it with the live branches list. Products aren't part of this fix's scope (the original
// report was about branches), so they're still fetched fresh here each time.
export function useShrinkageData(branchId: string | null, date: string) {
  return useQuery({
    queryKey: ['dashboard-shrinkage', branchId, date],
    queryFn: async (): Promise<ShrinkageData> => {
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

      const entriesByKey = new Map<string, ShrinkageEntry>()
      for (const l of ledgerRes.data ?? []) {
        entriesByKey.set(`${l.branch_id}:${l.product_id}`, {
          carryoverIn: l.carryover_in,
          shippedIn: l.shipped_in,
          available: l.available,
          sold: l.sold,
          wasted: l.wasted,
          carryoverOut: l.carryover_out,
          variance: l.unexplained_variance,
          explanation: l.explanation ?? null,
        })
      }

      return {
        products: (productsRes.data ?? []).map((p) => ({ id: p.id, label: `${p.flavor_name} (${p.size})` })),
        entriesByKey,
      }
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

export interface FlavorBreakdownRow {
  flavorName: string
  size: ProductSize
  unitsDirect: number
  unitsViaBundles: number
  unitsTotal: number
  revenue: number
}

export interface FlavorBreakdown {
  rows: FlavorBreakdownRow[]
  bundleCount: number
  bundleRevenue: number
}

export function useFlavorBreakdown(branchId: string | null, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['dashboard-flavor-breakdown', branchId, startDate, endDate],
    queryFn: async (): Promise<FlavorBreakdown> => {
      let saleQuery = supabase
        .from('sale_tally')
        .select('qty_sold, line_revenue, products(flavor_name, size)')
        .eq('is_void', false)
        .gte('date', startDate)
        .lte('date', endDate)
      if (branchId) saleQuery = saleQuery.eq('branch_id', branchId)
      const saleRes = await saleQuery
      if (saleRes.error) throw saleRes.error

      let bundleQuery = supabase
        .from('bundle_sale')
        .select('qty_bundles_sold, line_revenue, bundle_id')
        .eq('is_void', false)
        .gte('date', startDate)
        .lte('date', endDate)
      if (branchId) bundleQuery = bundleQuery.eq('branch_id', branchId)
      const bundleRes = await bundleQuery
      if (bundleRes.error) throw bundleRes.error

      const componentsRes = await supabase
        .from('bundle_components')
        .select('bundle_id, qty_per_bundle, products(flavor_name, size)')
      if (componentsRes.error) throw componentsRes.error

      // Bucketed by flavor + size — regular and junior of the same flavor are distinct products (own
      // price/ledger), so they're kept as separate rows rather than merged.
      const byFlavor = new Map<string, { flavorName: string; size: ProductSize; unitsDirect: number; unitsViaBundles: number; revenue: number }>()
      function bucket(flavorName: string, size: ProductSize) {
        const key = `${flavorName}__${size}`
        if (!byFlavor.has(key)) byFlavor.set(key, { flavorName, size, unitsDirect: 0, unitsViaBundles: 0, revenue: 0 })
        return byFlavor.get(key)!
      }

      for (const r of saleRes.data ?? []) {
        const flavorName = (r as any).products?.flavor_name ?? 'Unknown'
        const size = ((r as any).products?.size ?? 'regular') as ProductSize
        const b = bucket(flavorName, size)
        b.unitsDirect += r.qty_sold
        b.revenue += Number(r.line_revenue)
      }

      let bundleCount = 0
      let bundleRevenue = 0
      const componentsByBundle = new Map<string, { qty_per_bundle: number; flavorName: string; size: ProductSize }[]>()
      for (const c of componentsRes.data ?? []) {
        const flavorName = (c as any).products?.flavor_name ?? 'Unknown'
        const size = ((c as any).products?.size ?? 'regular') as ProductSize
        const list = componentsByBundle.get(c.bundle_id) ?? []
        list.push({ qty_per_bundle: c.qty_per_bundle, flavorName, size })
        componentsByBundle.set(c.bundle_id, list)
      }
      for (const bs of bundleRes.data ?? []) {
        bundleCount += bs.qty_bundles_sold
        bundleRevenue += Number(bs.line_revenue)
        const components = componentsByBundle.get(bs.bundle_id) ?? []
        for (const c of components) {
          const b = bucket(c.flavorName, c.size)
          b.unitsViaBundles += bs.qty_bundles_sold * c.qty_per_bundle
        }
      }

      // Regular flavors first, then junior — within each size group, highest-selling first.
      const rows: FlavorBreakdownRow[] = Array.from(byFlavor.values())
        .map((v) => ({
          flavorName: v.flavorName,
          size: v.size,
          unitsDirect: v.unitsDirect,
          unitsViaBundles: v.unitsViaBundles,
          unitsTotal: v.unitsDirect + v.unitsViaBundles,
          revenue: v.revenue,
        }))
        .sort((a, b) => {
          if (a.size !== b.size) return a.size === 'regular' ? -1 : 1
          return b.unitsTotal - a.unitsTotal
        })

      return { rows, bundleCount, bundleRevenue }
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
