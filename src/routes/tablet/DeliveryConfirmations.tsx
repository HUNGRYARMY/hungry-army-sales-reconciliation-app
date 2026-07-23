import { useState } from 'react'
import { formatTimestampTime } from '../../lib/formatTime'
import { confirmDeliveryReceipt, type BranchDeliveryRow } from './hooks'
import { getErrorMessage } from '../../lib/errorMessage'

function DeliveryEditForm({
  delivery,
  onConfirmed,
  onCancel,
}: {
  delivery: BranchDeliveryRow
  onConfirmed: () => void
  onCancel: (() => void) | null
}) {
  const [received, setReceived] = useState(delivery.qtyReceived === null ? '' : String(delivery.qtyReceived))
  const [reason, setReason] = useState(delivery.discrepancyReason ?? '')
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
          autoFocus
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-app-border px-3 py-2.5 text-sm text-app-text-muted"
          >
            Cancel
          </button>
        )}
      </div>
      {mismatched && (
        <input
          type="text"
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

function DeliverySummaryRow({ delivery, onEdit }: { delivery: BranchDeliveryRow; onEdit: () => void }) {
  const mismatched = delivery.qtyReceived !== delivery.qty
  const diff = (delivery.qtyReceived ?? 0) - delivery.qty
  return (
    <li>
      <button type="button" onClick={onEdit} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-app-bg">
        <div className="flex items-center justify-between">
          <span className="text-app-text">{delivery.productLabel}</span>
          <span className="text-app-text-muted">
            Commissary logged: {delivery.qty}
            <span className="ml-2 text-xs text-app-text-faint">{formatTimestampTime(delivery.deliveryTime)}</span>
          </span>
        </div>
        <div className="mt-0.5 text-right">
          {mismatched ? (
            <span className="text-app-error">
              You confirmed: {delivery.qtyReceived} ({diff > 0 ? '+' : ''}
              {diff}) — {delivery.discrepancyReason}
              <span className="ml-2 text-app-text-faint">· tap to correct</span>
            </span>
          ) : (
            <span className="text-app-text-muted">
              You confirmed: {delivery.qtyReceived} ✓<span className="ml-2 text-app-text-faint">· tap to correct</span>
            </span>
          )}
        </div>
      </button>
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
  const [editingId, setEditingId] = useState<string | null>(null)

  if (rows.length === 0) return null

  const pending = rows.filter((r) => r.qtyReceived === null)

  function handleConfirmed() {
    setEditingId(null)
    onConfirmed()
  }

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

      <ul className="divide-y divide-app-border">
        {rows.map((d) =>
          d.qtyReceived === null || editingId === d.id ? (
            <DeliveryEditForm
              key={d.id}
              delivery={d}
              onConfirmed={handleConfirmed}
              onCancel={d.qtyReceived === null ? null : () => setEditingId(null)}
            />
          ) : (
            <DeliverySummaryRow key={d.id} delivery={d} onEdit={() => setEditingId(d.id)} />
          ),
        )}
      </ul>

      <p className="px-4 py-3 text-xs text-app-text-faint">
        "Shipped today" and "Available" on the stock table below only count deliveries you've confirmed —
        unconfirmed deliveries don't count as received stock yet. Tap any delivery, confirmed or not, to
        enter or correct the quantity you actually counted (until that item's end-of-day is closed).
      </p>
    </div>
  )
}
