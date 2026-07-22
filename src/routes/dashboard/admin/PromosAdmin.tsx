import { useState } from 'react'
import { useAllPromosAdmin, insertPromo, updatePromoStatus, useInvalidateAdmin } from './hooks'

export function PromosAdmin() {
  const promos = useAllPromosAdmin()
  const invalidate = useInvalidateAdmin()

  const [name, setName] = useState('')
  const [ratePercent, setRatePercent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleAdd() {
    const rate = Number(ratePercent) / 100
    if (!name.trim() || !Number.isFinite(rate) || rate < 0 || rate > 1) {
      setError('Enter a name and a rate between 0 and 100')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await insertPromo({ name: name.trim(), rate })
      setName('')
      setRatePercent('')
      invalidate('admin-promos')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string, status: string) {
    setBusyId(id)
    try {
      await updatePromoStatus(id, status === 'active' ? 'discontinued' : 'active')
      invalidate('admin-promos')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="h-fit rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-4 text-sm font-semibold text-app-text">New promo</h2>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-app-text-muted">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-app-text-muted">Discount %</span>
          <input
            type="number"
            min={0}
            max={100}
            step="1"
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>
        {error && <p className="mb-3 text-sm text-app-error">{error}</p>}
        <button
          type="button"
          disabled={submitting}
          onClick={handleAdd}
          className="w-full rounded-md bg-app-accent py-2.5 font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add promo'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(promos.data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-app-border last:border-b-0">
                <td className="px-4 py-2.5 text-app-text">{p.name}</td>
                <td className="px-3 py-2.5 text-right text-app-text-muted">{Math.round(p.rate * 100)}%</td>
                <td className="px-3 py-2.5">
                  <span className={p.status === 'active' ? 'text-app-text' : 'text-app-text-faint'}>
                    {p.status === 'active' ? 'Active' : 'Discontinued'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleToggle(p.id, p.status)}
                    className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-50"
                  >
                    {p.status === 'active' ? 'Discontinue' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
            {(promos.data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-app-text-muted">
                  No promos yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
