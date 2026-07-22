import { useState } from 'react'
import { useAllBranchesAdmin, insertBranch, updateBranch, useInvalidateAdmin } from './hooks'

export function BranchesAdmin() {
  const branches = useAllBranchesAdmin()
  const invalidate = useInvalidateAdmin()

  const [name, setName] = useState('')
  const [closingTime, setClosingTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleAdd() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await insertBranch({ name: name.trim(), closing_time: closingTime || null })
      setName('')
      setClosingTime('')
      invalidate('admin-branches')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setBusyId(id)
    try {
      await updateBranch(id, { is_active: !isActive })
      invalidate('admin-branches')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="h-fit rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-4 text-sm font-semibold text-app-text">New branch</h2>
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
          <span className="mb-1 block text-app-text-muted">Closing time (reference only)</span>
          <input
            type="time"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
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
          {submitting ? 'Saving…' : 'Add branch'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Closing time</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(branches.data ?? []).map((b) => (
              <tr key={b.id} className="border-b border-app-border last:border-b-0">
                <td className="px-4 py-2.5 text-app-text">{b.name}</td>
                <td className="px-3 py-2.5 text-app-text-muted">{b.closing_time ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <span className={b.is_active ? 'text-app-text' : 'text-app-text-faint'}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => handleToggleActive(b.id, b.is_active)}
                    className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-50"
                  >
                    {b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
