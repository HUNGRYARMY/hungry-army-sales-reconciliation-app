import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'
import { isExplanationRequiredError } from '../../lib/thresholdError'
import type { Product } from '../../types/domain'

export function DispositionRow({
  product,
  branchId,
  enteredBy,
  alreadyLogged,
  onSubmitted,
}: {
  product: Product
  branchId: string
  enteredBy: string
  alreadyLogged: boolean
  onSubmitted: () => void
}) {
  const [wasted, setWasted] = useState('0')
  const [reason, setReason] = useState('')
  const [carriedForward, setCarriedForward] = useState('0')
  const [needsExplanation, setNeedsExplanation] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(alreadyLogged)

  async function submit(withExplanation?: string) {
    const wastedNum = Number(wasted)
    const carriedNum = Number(carriedForward)
    if (!Number.isInteger(wastedNum) || wastedNum < 0 || !Number.isInteger(carriedNum) || carriedNum < 0) {
      setError('Enter valid whole numbers')
      return
    }
    if (wastedNum > 0 && !reason.trim()) {
      setError('Reason is required when waste > 0')
      return
    }

    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('end_of_day_disposition').insert({
      date: getBusinessDate(),
      branch_id: branchId,
      product_id: product.id,
      qty_wasted: wastedNum,
      reason: wastedNum > 0 ? reason.trim() : null,
      qty_carried_forward: carriedNum,
      explanation: withExplanation ?? null,
      entered_by: enteredBy,
    })
    setSubmitting(false)

    if (insertError) {
      if (isExplanationRequiredError(insertError.message)) {
        setNeedsExplanation(true)
        setError(insertError.message)
        return
      }
      setError(insertError.message)
      return
    }

    setDone(true)
    onSubmitted()
  }

  if (done) {
    return (
      <div className="flex items-center justify-between rounded-md border border-app-border bg-app-card px-3 py-2.5 text-sm">
        <span className="text-app-text">
          {product.flavor_name} ({product.size})
        </span>
        <span className="text-app-text-muted">Logged ✓</span>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-app-border bg-app-card px-3 py-3">
      <div className="mb-2 text-sm font-medium text-app-text">
        {product.flavor_name} ({product.size})
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-app-text-muted">
          Wasted
          <input
            type="number"
            min={0}
            step="1"
            value={wasted}
            onChange={(e) => setWasted(e.target.value)}
            className="mt-1 w-full rounded-md border border-app-border bg-app-bg px-2 py-2 text-sm text-app-text outline-none focus:border-app-accent"
          />
        </label>
        <label className="text-xs text-app-text-muted">
          Carried forward
          <input
            type="number"
            min={0}
            step="1"
            value={carriedForward}
            onChange={(e) => setCarriedForward(e.target.value)}
            className="mt-1 w-full rounded-md border border-app-border bg-app-bg px-2 py-2 text-sm text-app-text outline-none focus:border-app-accent"
          />
        </label>
      </div>

      {Number(wasted) > 0 && (
        <label className="mt-2 block text-xs text-app-text-muted">
          Waste reason (required)
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-app-border bg-app-bg px-2 py-2 text-sm text-app-text outline-none focus:border-app-accent"
          />
        </label>
      )}

      {needsExplanation && (
        <label className="mt-2 block text-xs text-app-error">
          Shrinkage exceeds threshold — explanation required
          <input
            type="text"
            autoFocus
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="mt-1 w-full rounded-md border border-app-error bg-app-bg px-2 py-2 text-sm text-app-text outline-none"
          />
        </label>
      )}

      {error && !needsExplanation && <p className="mt-2 text-xs text-app-error">{error}</p>}

      <button
        type="button"
        disabled={submitting || (needsExplanation && !explanation.trim())}
        onClick={() => submit(needsExplanation ? explanation.trim() : undefined)}
        className="mt-3 w-full rounded-md bg-app-accent py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
      >
        {submitting ? 'Saving…' : needsExplanation ? 'Submit with explanation' : 'Log'}
      </button>
    </div>
  )
}
