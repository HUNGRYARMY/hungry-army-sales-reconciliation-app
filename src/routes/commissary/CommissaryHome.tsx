import { useState, type FormEvent } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useToast, ToastView } from '../../components/Toast'
import { useAuth } from '../../lib/auth/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'
import { useActiveProducts } from '../tablet/hooks'
import { useAllBranches, useTodayDeliveries, useInvalidateTodayDeliveries } from './hooks'

export function CommissaryHome() {
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
      <div className="grid gap-4 p-4 lg:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-lg border border-app-border bg-app-sidebar p-4"
        >
          <h2 className="mb-4 text-sm font-semibold text-app-text">Log a delivery</h2>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-app-text-muted">Branch</span>
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
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

          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-app-text-muted">Product</span>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
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

          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-app-text-muted">Quantity</span>
            <input
              type="number"
              min={1}
              step="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-app-accent py-2.5 font-medium text-white transition-colors hover:bg-app-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Logging…' : 'Log delivery'}
          </button>
        </form>

        <div className="rounded-lg border border-app-border bg-app-sidebar">
          <h2 className="border-b border-app-border px-4 py-3 text-sm font-semibold text-app-text">
            Today's deliveries — all branches
          </h2>
          {(deliveries.data ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-app-text-muted">No deliveries logged yet today.</p>
          ) : (
            <ul className="divide-y divide-app-border">
              {(deliveries.data ?? []).map((d, i, all) => {
                const isNewBranch = i === 0 || all[i - 1].branchName !== d.branchName
                return (
                  <li key={d.id}>
                    {isNewBranch && (
                      <div className="bg-app-bg px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                        {d.branchName}
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-app-text">{d.productLabel}</span>
                      <span className="text-app-text-muted">+{d.qty}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <ToastView toast={toast} />
    </AppShell>
  )
}
