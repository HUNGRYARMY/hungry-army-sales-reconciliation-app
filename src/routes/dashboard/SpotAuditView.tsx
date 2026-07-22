import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth/AuthContext'
import { useAllBranches } from '../../lib/queries/branches'
import { getBusinessDate } from '../../lib/businessDate'
import { useSpotAuditRows, fetchSubmittedTotal, insertSpotAudit, useInvalidateDashboard } from './hooks'

function peso(n: number | null) {
  return n === null ? '—' : `₱${n.toFixed(2)}`
}

export function SpotAuditView({ branchId }: { branchId: string | null }) {
  const { profile } = useAuth()
  const branches = useAllBranches()
  const rows = useSpotAuditRows(branchId)
  const invalidate = useInvalidateDashboard()

  const [formBranchId, setFormBranchId] = useState(branchId ?? '')
  const [date, setDate] = useState(() => getBusinessDate())
  const [countedAmount, setCountedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submittedTotal, setSubmittedTotal] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!formBranchId || !date) {
      setSubmittedTotal(null)
      return
    }
    fetchSubmittedTotal(formBranchId, date)
      .then(setSubmittedTotal)
      .catch(() => setSubmittedTotal(null))
  }, [formBranchId, date])

  const countedNum = Number(countedAmount)
  const variancePreview =
    Number.isFinite(countedNum) && countedAmount !== '' && submittedTotal !== null ? countedNum - submittedTotal : null

  async function handleSubmit() {
    if (!profile || !formBranchId || countedAmount === '' || !Number.isFinite(countedNum) || countedNum < 0) {
      setError('Select a branch and enter a valid counted amount')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await insertSpotAudit({
        date,
        branch_id: formBranchId,
        counted_amount: countedNum,
        compared_to_submitted: submittedTotal,
        notes: notes.trim() || null,
        performed_by: profile.id,
      })
      setCountedAmount('')
      setNotes('')
      invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[360px_1fr]">
      <div className="h-fit rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-4 text-sm font-semibold text-app-text">New spot audit</h2>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-app-text-muted">Branch</span>
          <select
            value={formBranchId}
            onChange={(e) => setFormBranchId(e.target.value)}
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
          <span className="mb-1 block text-app-text-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>

        <p className="mb-3 text-xs text-app-text-muted">
          Submitted total for that day: <span className="text-app-text">{peso(submittedTotal)}</span>
        </p>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-app-text-muted">Counted amount</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={countedAmount}
            onChange={(e) => setCountedAmount(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>

        {variancePreview !== null && (
          <p className={`mb-3 text-xs ${variancePreview !== 0 ? 'text-app-error' : 'text-app-text-muted'}`}>
            Variance: {peso(variancePreview)}
          </p>
        )}

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-app-text-muted">Notes</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>

        {error && <p className="mb-3 text-sm text-app-error">{error}</p>}

        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full rounded-md bg-app-accent py-2.5 font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Log spot audit'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 text-right font-medium">Counted</th>
              <th className="px-3 py-2 text-right font-medium">Submitted</th>
              <th className="px-3 py-2 text-right font-medium">Variance</th>
              <th className="px-4 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(rows.data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-app-border last:border-b-0">
                <td className="px-4 py-2.5 text-app-text">{r.date}</td>
                <td className="px-3 py-2.5 text-app-text">{r.branchName}</td>
                <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r.countedAmount)}</td>
                <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r.comparedToSubmitted)}</td>
                <td
                  className={`px-3 py-2.5 text-right font-medium ${
                    r.variance !== null && r.variance !== 0 ? 'text-app-error' : 'text-app-text'
                  }`}
                >
                  {peso(r.variance)}
                </td>
                <td className="px-4 py-2.5 text-app-text-muted">{r.notes ?? '—'}</td>
              </tr>
            ))}
            {(rows.data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-app-text-muted">
                  No spot audits logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
