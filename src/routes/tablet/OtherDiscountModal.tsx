import { useState, type FormEvent } from 'react'
import type { Product } from '../../types/domain'

interface Props {
  product: Product
  submitting: boolean
  onCancel: () => void
  onConfirm: (ratePercent: number, reason: string) => void
}

export function OtherDiscountModal({ product, submitting, onCancel, onConfirm }: Props) {
  const [rate, setRate] = useState('')
  const [reason, setReason] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const pct = Number(rate)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100 || !reason.trim()) return
    onConfirm(pct / 100, reason.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-app-border bg-app-card p-5 text-app-text"
      >
        <h2 className="mb-1 text-base font-semibold">Other discount</h2>
        <p className="mb-4 text-sm text-app-text-muted">
          {product.flavor_name} ({product.size}) — flagged for founder review since it isn't a preset rate.
        </p>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-app-text-muted">Discount %</span>
          <input
            type="number"
            min={0}
            max={100}
            step="1"
            required
            autoFocus
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 outline-none focus:border-app-accent"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-app-text-muted">Reason (required)</span>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 outline-none focus:border-app-accent"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md border border-app-border py-2.5 text-app-text-muted hover:text-app-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-md bg-app-accent py-2.5 font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  )
}
