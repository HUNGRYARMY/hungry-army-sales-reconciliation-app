import { useMemo, useState, type FormEvent } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useToast, ToastView } from '../../components/Toast'
import { useAuth } from '../../lib/auth/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'
import { formatTimestampTime } from '../../lib/formatTime'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useFavicon } from '../../lib/useFavicon'
import { useActiveProducts } from '../tablet/hooks'
import { useAllBranches, useTodayDeliveries, useInvalidateTodayDeliveries, groupDeliveriesByBranchAndProduct } from './hooks'

function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n}st`
  if (n % 10 === 2 && n % 100 !== 12) return `${n}nd`
  if (n % 10 === 3 && n % 100 !== 13) return `${n}rd`
  return `${n}th`
}

export function CommissaryHome() {
  useDocumentTitle('Hungry Army Commissary')
  useFavicon('/favicon-commissary.png')
  const { profile } = useAuth()
  const branches = useAllBranches()
  const products = useActiveProducts()
  const deliveries = useTodayDeliveries()
  const invalidateDeliveries = useInvalidateTodayDeliveries()
  const { toast, show } = useToast()

  const [branchId, setBranchId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const branchGroups = useMemo(() => groupDeliveriesByBranchAndProduct(deliveries.data ?? []), [deliveries.data])

  function step(delta: number) {
    setQty((current) => {
      const next = (Number(current) || 0) + delta
      return next > 0 ? String(next) : ''
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile || !branchId || !productId) return
    const qtyNum = Number(qty)
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      show('Enter a valid quantity', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('deliveries').insert({
      date: getBusinessDate(),
      branch_id: branchId,
      product_id: productId,
      qty: qtyNum,
      entered_by: profile.id,
    })
    setSubmitting(false)

    if (error) {
      show(error.message, 'error')
      return
    }
    show('Delivery logged')
    setQty('')
    invalidateDeliveries()
  }

  return (
    <AppShell>
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-lg border border-app-border bg-app-sidebar p-4"
        >
          <h2 className="mb-4 text-base font-semibold text-app-text">Log a delivery</h2>

          <label className="mb-3 block text-base">
            <span className="mb-1.5 block text-sm text-app-text-muted">Branch</span>
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-md border border-app-border bg-app-bg px-3 py-3.5 text-base text-app-text outline-none focus:border-app-accent"
            >
              <option value="" disabled>
                Select branch…
              </option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 block text-base">
            <span className="mb-1.5 block text-sm text-app-text-muted">Product</span>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-app-border bg-app-bg px-3 py-3.5 text-base text-app-text outline-none focus:border-app-accent"
            >
              <option value="" disabled>
                Select product…
              </option>
              {(products.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.flavor_name} ({p.size})
                </option>
              ))}
            </select>
          </label>

          <label className="mb-4 block text-base">
            <span className="mb-1.5 block text-sm text-app-text-muted">Quantity</span>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => step(-1)}
                className="w-14 shrink-0 rounded-md border border-app-border bg-app-bg text-2xl text-app-text-muted transition-colors hover:border-app-accent hover:text-app-text active:bg-app-border/40"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                step="1"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full min-w-0 rounded-md border border-app-border bg-app-bg px-3 py-3.5 text-center text-base text-app-text outline-none focus:border-app-accent"
              />
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => step(1)}
                className="w-14 shrink-0 rounded-md border border-app-border bg-app-bg text-2xl text-app-text-muted transition-colors hover:border-app-accent hover:text-app-text active:bg-app-border/40"
              >
                +
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-app-accent py-3.5 text-base font-medium text-white transition-colors hover:bg-app-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Logging…' : 'Log delivery'}
          </button>
        </form>

        <div className="rounded-lg border border-app-border bg-app-sidebar">
          <h2 className="border-b border-app-border px-4 py-3 text-sm font-semibold text-app-text">
            Today's deliveries — all branches
          </h2>
          {branchGroups.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-app-text-muted">No deliveries logged yet today.</p>
          ) : (
            <div className="divide-y divide-app-border">
              {branchGroups.map((branch) => (
                <div key={branch.branchName}>
                  <div className="bg-app-bg px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    {branch.branchName}
                  </div>
                  <ul className="divide-y divide-app-border">
                    {branch.products.map((p) => (
                      <li key={p.productLabel} className="px-4 py-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-app-text">{p.productLabel}</span>
                          <span className="font-medium text-app-text">
                            {p.entries.length > 1 ? `Total: ${p.total}` : `+${p.total}`}
                          </span>
                        </div>
                        {p.entries.length > 1 && (
                          <ul className="mt-1.5 space-y-1 border-l border-app-border pl-3">
                            {p.entries.map((e, idx) => (
                              <li key={e.id} className="flex items-center justify-between text-xs text-app-text-muted">
                                <span>
                                  {ordinal(idx + 1)} delivery · {formatTimestampTime(e.deliveryTime)}
                                </span>
                                <span>+{e.qty}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ToastView toast={toast} />
    </AppShell>
  )
}
