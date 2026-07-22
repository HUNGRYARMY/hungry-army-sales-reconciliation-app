import { useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useToast, ToastView } from '../../components/Toast'
import { useAuth } from '../../lib/auth/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'
import {
  useActiveProducts,
  useActivePromos,
  useActiveBundles,
  useTodayActivity,
  useInvalidateTodayActivity,
  useTodayStock,
  useInvalidateTodayStock,
} from './hooks'
import { DiscountBar } from './DiscountBar'
import { ProductGrid } from './ProductGrid'
import { BundleGrid } from './BundleGrid'
import { OtherDiscountModal } from './OtherDiscountModal'
import { RecentActivity } from './RecentActivity'
import { StockTable } from './StockTable'
import { DispositionForm } from './DispositionForm'
import { CashEntryForm } from './CashEntryForm'
import type { DiscountType, Product, Bundle } from '../../types/domain'

type Tab = 'stock' | 'products' | 'bundles' | 'close-day'

export function TabletHome() {
  const { profile } = useAuth()
  const branchId = profile?.branch_id ?? null

  const [tab, setTab] = useState<Tab>('stock')
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null)
  const [otherModalProduct, setOtherModalProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { toast, show } = useToast()
  const products = useActiveProducts()
  const promos = useActivePromos()
  const bundles = useActiveBundles()
  const activity = useTodayActivity(branchId)
  const invalidateActivity = useInvalidateTodayActivity()
  const stock = useTodayStock(branchId)
  const invalidateStock = useInvalidateTodayStock()

  function invalidateAfterSale() {
    invalidateActivity()
    invalidateStock()
  }

  function resetDiscountAfterTap() {
    // one-tap-per-sale flow: after a discounted sale, snap back to Regular so the next tap (usually
    // full-price) doesn't accidentally inherit the discount from a prior transaction.
    setDiscountType('none')
    setSelectedPromoId(null)
  }

  async function insertSaleTally(product: Product, extra: Record<string, unknown> = {}) {
    if (!profile || !branchId) return
    setSubmitting(true)
    const { error } = await supabase.from('sale_tally').insert({
      date: getBusinessDate(),
      branch_id: branchId,
      product_id: product.id,
      qty_sold: 1,
      discount_type: discountType,
      entered_by: profile.id,
      ...extra,
    })
    setSubmitting(false)
    if (error) {
      show(error.message, 'error')
      return
    }
    show(`${product.flavor_name} (${product.size}) +1`)
    invalidateAfterSale()
    resetDiscountAfterTap()
  }

  function handleProductTap(product: Product) {
    if (discountType === 'other') {
      setOtherModalProduct(product)
      return
    }
    if (discountType === 'promo') {
      if (!selectedPromoId) {
        show('Select a promo first', 'error')
        return
      }
      insertSaleTally(product, { promo_id: selectedPromoId })
      return
    }
    insertSaleTally(product)
  }

  async function handleOtherConfirm(ratePercent: number, reason: string) {
    if (!otherModalProduct) return
    const product = otherModalProduct
    setSubmitting(true)
    const { error } = await supabase.from('sale_tally').insert({
      date: getBusinessDate(),
      branch_id: branchId,
      product_id: product.id,
      qty_sold: 1,
      discount_type: 'other',
      manual_discount_rate: ratePercent,
      discount_reason: reason,
      entered_by: profile!.id,
    })
    setSubmitting(false)
    setOtherModalProduct(null)
    if (error) {
      show(error.message, 'error')
      return
    }
    show(`${product.flavor_name} (${product.size}) +1 — flagged for review`)
    invalidateAfterSale()
    resetDiscountAfterTap()
  }

  async function handleBundleTap(bundle: Bundle) {
    if (!profile || !branchId) return
    setSubmitting(true)
    const { error } = await supabase.from('bundle_sale').insert({
      date: getBusinessDate(),
      branch_id: branchId,
      bundle_id: bundle.id,
      qty_bundles_sold: 1,
      entered_by: profile.id,
    })
    setSubmitting(false)
    if (error) {
      show(error.message, 'error')
      return
    }
    show(`${bundle.name} +1`)
    invalidateAfterSale()
  }

  return (
    <AppShell>
      <div className="flex border-b border-app-border bg-app-sidebar px-4">
        <button
          type="button"
          onClick={() => setTab('stock')}
          className={`border-b-2 px-4 py-3 text-sm font-medium ${
            tab === 'stock' ? 'border-app-accent text-app-text' : 'border-transparent text-app-text-muted'
          }`}
        >
          Stock
        </button>
        <button
          type="button"
          onClick={() => setTab('products')}
          className={`border-b-2 px-4 py-3 text-sm font-medium ${
            tab === 'products' ? 'border-app-accent text-app-text' : 'border-transparent text-app-text-muted'
          }`}
        >
          Products
        </button>
        <button
          type="button"
          onClick={() => setTab('bundles')}
          className={`border-b-2 px-4 py-3 text-sm font-medium ${
            tab === 'bundles' ? 'border-app-accent text-app-text' : 'border-transparent text-app-text-muted'
          }`}
        >
          Bundles
        </button>
        <button
          type="button"
          onClick={() => setTab('close-day')}
          className={`border-b-2 px-4 py-3 text-sm font-medium ${
            tab === 'close-day' ? 'border-app-accent text-app-text' : 'border-transparent text-app-text-muted'
          }`}
        >
          Close Day
        </button>
      </div>

      {tab === 'products' && (
        <DiscountBar
          value={discountType}
          onChange={(v) => {
            setDiscountType(v)
            setSelectedPromoId(null)
          }}
          promos={promos.data ?? []}
          selectedPromoId={selectedPromoId}
          onSelectPromo={setSelectedPromoId}
        />
      )}

      {tab === 'stock' ? (
        <div className="p-4">
          <div className="rounded-lg border border-app-border bg-app-sidebar">
            <h2 className="border-b border-app-border px-4 py-3 text-sm font-semibold text-app-text">
              Today's stock
            </h2>
            <StockTable rows={stock.data ?? []} />
          </div>
        </div>
      ) : tab === 'close-day' ? (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {branchId && profile && <DispositionForm branchId={branchId} enteredBy={profile.id} />}
          {branchId && profile && <CashEntryForm branchId={branchId} enteredBy={profile.id} />}
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-app-border bg-app-sidebar">
            {tab === 'products' ? (
              <ProductGrid products={products.data ?? []} disabled={submitting} onTap={handleProductTap} />
            ) : (
              <BundleGrid bundles={bundles.data ?? []} disabled={submitting} onTap={handleBundleTap} />
            )}
          </div>

          <div className="rounded-lg border border-app-border bg-app-sidebar">
            <h2 className="border-b border-app-border px-4 py-3 text-sm font-semibold text-app-text">
              Today's activity
            </h2>
            <RecentActivity rows={activity.data ?? []} onVoided={invalidateAfterSale} />
          </div>
        </div>
      )}

      {otherModalProduct && (
        <OtherDiscountModal
          product={otherModalProduct}
          submitting={submitting}
          onCancel={() => setOtherModalProduct(null)}
          onConfirm={handleOtherConfirm}
        />
      )}

      <ToastView toast={toast} />
    </AppShell>
  )
}
