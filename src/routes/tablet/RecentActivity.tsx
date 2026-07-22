import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/AuthContext'
import type { RecentTallyRow } from './hooks'

const DISCOUNT_LABEL: Record<string, string> = {
  none: 'Regular',
  senior: 'Senior',
  pwd: 'PWD',
  promo: 'Promo',
  other: 'Other',
}

export function RecentActivity({
  rows,
  onVoided,
}: {
  rows: RecentTallyRow[]
  onVoided: () => void
}) {
  const { profile } = useAuth()
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-app-text-muted">No sales logged yet today.</p>
  }

  async function confirmVoid(row: RecentTallyRow) {
    if (!reason.trim()) {
      setError('Reason is required')
      return
    }
    setSubmitting(true)
    setError(null)
    const fn = row.kind === 'sale' ? 'void_sale_tally' : 'void_bundle_sale'
    const { error: rpcError } = await supabase.rpc(fn, { p_id: row.id, p_reason: reason.trim() })
    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setVoidingId(null)
    setReason('')
    onVoided()
  }

  return (
    <ul className="divide-y divide-app-border">
      {rows.map((r) => {
        const canVoid = !r.isVoid && r.enteredBy === profile?.id
        return (
          <li key={`${r.kind}-${r.id}`} className="px-4 py-2.5 text-sm">
            <div className={`flex items-center justify-between ${r.isVoid ? 'opacity-40 line-through' : ''}`}>
              <span className="text-app-text">
                {r.label}
                {r.kind === 'sale' && r.discountType && r.discountType !== 'none' && (
                  <span className="ml-2 rounded bg-app-accent/20 px-1.5 py-0.5 text-xs text-app-accent">
                    {DISCOUNT_LABEL[r.discountType] ?? r.discountType}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-app-text-muted">+{r.qty}</span>
                {canVoid && voidingId !== r.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoidingId(r.id)
                      setReason('')
                      setError(null)
                    }}
                    className="text-xs text-app-text-faint hover:text-app-error"
                  >
                    Void
                  </button>
                )}
              </div>
            </div>

            {voidingId === r.id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Why void this?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex-1 rounded-md border border-app-border bg-app-bg px-2 py-1.5 text-xs text-app-text outline-none focus:border-app-accent"
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => confirmVoid(r)}
                  className="rounded-md bg-app-error px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {submitting ? '…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setVoidingId(null)}
                  className="rounded-md border border-app-border px-2 py-1.5 text-xs text-app-text-muted"
                >
                  Cancel
                </button>
              </div>
            )}
            {voidingId === r.id && error && <p className="mt-1 text-xs text-app-error">{error}</p>}
          </li>
        )
      })}
    </ul>
  )
}
