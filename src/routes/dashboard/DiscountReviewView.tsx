import { useState } from 'react'
import { useDiscountReviewRows, markDiscountReviewed, useInvalidateDashboard } from './hooks'

export function DiscountReviewView({ branchId }: { branchId: string | null }) {
  const rows = useDiscountReviewRows(branchId)
  const invalidate = useInvalidateDashboard()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  async function handleReview(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await markDiscountReviewed(id, notes[id]?.trim() || null)
      invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  const list = rows.data ?? []

  return (
    <div className="p-4">
      {error && <p className="mb-3 text-sm text-app-error">{error}</p>}
      {list.length === 0 ? (
        <p className="rounded-lg border border-app-border bg-app-sidebar px-4 py-6 text-center text-sm text-app-text-muted">
          Nothing pending review.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className="rounded-lg border border-app-border bg-app-sidebar p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-app-text">
                  {r.branchName} — {r.productLabel} × {r.qtySold}
                </span>
                <span className="text-app-text-muted">{r.enteredByName}</span>
              </div>
              <p className="mb-2 text-sm text-app-text-muted">
                {r.manualDiscountRate !== null ? `${Math.round(r.manualDiscountRate * 100)}% off` : ''} —{' '}
                {r.discountReason ?? 'no reason given'}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Review notes (optional)"
                  value={notes[r.id] ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="flex-1 rounded-md border border-app-border bg-app-bg px-2 py-1.5 text-sm text-app-text outline-none focus:border-app-accent"
                />
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => handleReview(r.id)}
                  className="rounded-md bg-app-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
                >
                  {busyId === r.id ? '…' : 'Mark reviewed'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
