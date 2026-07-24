import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getBusinessDate } from '../../lib/businessDate'
import { isExplanationRequiredError } from '../../lib/thresholdError'
import { useTodayCashEntry, useInvalidateTodayCashEntry } from './hooks'

export function CashEntryForm({ branchId, enteredBy }: { branchId: string; enteredBy: string }) {
  const existing = useTodayCashEntry(branchId)
  const invalidate = useInvalidateTodayCashEntry()

  const [cashCounted, setCashCounted] = useState('')
  const [digitalPayments, setDigitalPayments] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [needsExplanation, setNeedsExplanation] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(withExplanation?: string) {
    const cash = Number(cashCounted)
    const digital = Number(digitalPayments || '0')
    if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(digital) || digital < 0) {
      setError('Enter valid amounts')
      return
    }

    setSubmitting(true)
    setError(null)

    let path = photoPath
    if (photoFile && !path) {
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const objectPath = `${branchId}/${getBusinessDate()}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('cash-photos').upload(objectPath, photoFile)
      if (uploadError) {
        setSubmitting(false)
        setError(uploadError.message)
        return
      }
      path = objectPath
      setPhotoPath(objectPath)
    }

    const { error: insertError } = await supabase.from('daily_cash_entry').insert({
      date: getBusinessDate(),
      branch_id: branchId,
      cash_counted: cash,
      digital_payments: digital,
      cash_photo_path: path,
      notes: notes.trim() || null,
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

    invalidate()
  }

  if (existing.data) {
    const d = existing.data
    return (
      <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-3 text-sm font-semibold text-app-text">Daily cash entry — logged ✓</h2>
        <dl className="space-y-1 text-sm">
          <Row label="Cash counted" value={`₱${Number(d.cash_counted).toFixed(2)}`} />
          <Row label="Digital payments" value={`₱${Number(d.digital_payments).toFixed(2)}`} />
          <Row label="Computed gross sales" value={`₱${Number(d.computed_gross_sales).toFixed(2)}`} />
          <Row label="Variance" value={`₱${Number(d.variance_vs_cash).toFixed(2)}`} />
          {d.explanation && <Row label="Explanation" value={d.explanation} />}
        </dl>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
      <h2 className="mb-3 text-sm font-semibold text-app-text">Daily cash entry</h2>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-app-text-muted">Cash counted</span>
        <input
          type="number"
          min={0}
          step="0.01"
          required
          value={cashCounted}
          onChange={(e) => setCashCounted(e.target.value)}
          className="w-full rounded-md border border-app-border bg-app-bg px-3 py-3 text-base text-app-text outline-none focus:border-app-accent"
        />
      </label>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-app-text-muted">Digital payments</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={digitalPayments}
          onChange={(e) => setDigitalPayments(e.target.value)}
          className="w-full rounded-md border border-app-border bg-app-bg px-3 py-3 text-base text-app-text outline-none focus:border-app-accent"
        />
      </label>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-app-text-muted">Cash photo</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setPhotoFile(e.target.files?.[0] ?? null)
            setPhotoPath(null)
          }}
          className="w-full text-sm text-app-text-muted"
        />
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1 block text-app-text-muted">Notes</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-app-border bg-app-bg px-3 py-3 text-base text-app-text outline-none focus:border-app-accent"
        />
      </label>

      {needsExplanation && (
        <label className="mb-4 block text-sm text-app-error">
          Cash variance exceeds threshold — explanation required
          <input
            type="text"
            autoFocus
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-app-error bg-app-bg px-3 py-3 text-base text-app-text outline-none"
          />
        </label>
      )}

      {error && !needsExplanation && <p className="mb-3 text-sm text-app-error">{error}</p>}

      <button
        type="button"
        disabled={submitting || (needsExplanation && !explanation.trim())}
        onClick={() => submit(needsExplanation ? explanation.trim() : undefined)}
        className="w-full rounded-md bg-app-accent py-3.5 text-base font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
      >
        {submitting ? 'Saving…' : needsExplanation ? 'Submit with explanation' : 'Submit'}
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-app-text-muted">{label}</dt>
      <dd className="text-app-text">{value}</dd>
    </div>
  )
}
