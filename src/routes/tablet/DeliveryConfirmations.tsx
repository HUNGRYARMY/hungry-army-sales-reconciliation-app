import { useState } from 'react'
import { formatTimestampTime } from '../../lib/formatTime'
import { confirmDeliveryReceipt, type BranchDeliveryRow } from './hooks'
import { getErrorMessage } from '../../lib/errorMessage'

function ConfirmRow({ delivery, onConfirmed }: { delivery: BranchDeliveryRow; onConfirmed: () => void }) {
  const [received, setReceived] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const receivedNum = Number(received)
  const isValid = received !== '' && Number.isInteger(receivedNum) && receivedNum >= 0
  const mismatched = isValid && receivedNum !== delivery.qty

  async function handleConfirm() {
    if (!isValid) {
      setError('Enter the quantity you actually counted')
      return
    }
    if (mismatched && !reason.trim()) {
      setError('A reason is required since this differs from what commissary logged')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await confirmDeliveryReceipt(delivery.id, receivedNum, mismatched ? reason.trim() : undefined)
      onConfirmed()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-app-text">{delivery.productLabel}</span>
        <span className="text-app-text-muted">Commissary logged: {delivery.qty}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step="1"
          placeholder="Qty you counted"
          value={received}
          onChange={(e) => setReceived(e.target.value)}
          className="w-32 rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={handleConfirm}
          className="rounded-md bg-app-accent px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Confirming…' : 'Confirm receipt'}
        </button>
      </div>
      {mismatched && (
        <input
          type="text"
          autoFocus
          placeholder={`Why the difference? (${receivedNum > delivery.qty ? '+' : ''}${receivedNum - delivery.qty} vs. logged)`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2 w-full rounded-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
        />
      )}
      {error && <p className="mt-1.5 text-xs text-app-error">{error}</p>}
    </li>
  )
}

export function DeliveryConfirmations({
  rows,
  onConfirmed,
}: {
  rows: BranchDeliveryRow[]
  onConfirmed: () => void
}) {
  if (rows.length === 0) return null

  const pending = rows.filter((r) => r.qtyReceived === null)
  const confirmed = rows.filter((r) => r.qtyReceived !== null)

  return (
    <div className="mb-4 rounded-lg border border-app-border bg-app-sidebar">
      <h2 className="border-b border-app-border px-4 py-3 text-sm font-semibold text-app-text">
        Today's deliveries
        {pending.length > 0 && (
          <span className="ml-2 rounded-full bg-app-error/20 px-2 py-0.5 text-xs font-medium text-app-error">
            {pending.length} need{pending.length === 1 ? 's' : ''} confirmation
          </span>
        )}
      </h2>

      {pending.length > 0 && (
        <ul className="divide-y divide-app-border">
          {pending.map((d) => (
            <ConfirmRow key={d.id} delivery={d} onConfirmed={onConfirmed} />
          ))}
        </ul>
      )}

      {confirmed.length > 0 && (
        <ul className="divide-y divide-app-border">
          {confirmed.map((d) => {
            const mismatched = d.qtyReceived !== d.qty
            const diff = (d.qtyReceived ?? 0) - d.qty
            return (
              <li key={d.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-app-text">
                  {d.productLabel}
                  <span className="ml-2 text-xs text-app-text-faint">{formatTimestampTime(d.deliveryTime)}</span>
                </span>
                {mismatched ? (
                  <span className="text-right text-app-error">
                    Received {d.qtyReceived} of {d.qty} ({diff > 0 ? '+' : ''}
                    {diff}) — {d.discrepancyReason}
                  </span>
                ) : (
                  <span className="text-app-text-muted">Confirmed: {d.qty} ✓</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="px-4 py-3 text-xs text-app-text-faint">
        "Shipped today" and "Available" on the stock table below only count deliveries you've confirmed —
        unconfirmed deliveries don't count as received stock yet.
      </p>
    </div>
  )
}
