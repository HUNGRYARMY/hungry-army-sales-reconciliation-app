import { useState } from 'react'
import { insertBranch, updateBranch, reorderBranches, useInvalidateAdmin } from './hooks'
import { useAllBranches } from '../../../lib/queries/branches'
import { getErrorMessage } from '../../../lib/errorMessage'
import { formatTime12h } from '../../../lib/formatTime'
import type { Branch } from '../../../types/domain'

export function BranchesAdmin() {
  const branches = useAllBranches()
  const invalidate = useInvalidateAdmin()

  const [name, setName] = useState('')
  const [closingTime, setClosingTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editClosingTime, setEditClosingTime] = useState('')

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
      invalidate('branches')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setBusyId(id)
    try {
      await updateBranch(id, { is_active: !isActive })
      invalidate('branches')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  function openEditor(b: Branch) {
    setEditId(b.id)
    setEditName(b.name)
    setEditClosingTime(b.closing_time ?? '')
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      setError('Name is required')
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await updateBranch(id, { name: editName.trim(), closing_time: editClosingTime || null })
      setEditId(null)
      invalidate('branches')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleMove(list: Branch[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= list.length) return
    const reordered = [...list]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setBusyId(reordered[index].id)
    setError(null)
    try {
      await reorderBranches(reordered.map((b) => b.id))
      invalidate('branches')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const list = branches.data ?? []

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
        <p className="mt-2 text-xs text-app-text-faint">
          Click a branch's name or closing time to edit it. Use ↑/↓ to reorder — this order is used
          everywhere branches are listed (dropdowns, filters, the tablet).
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Closing time</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((b, index) => (
              <tr key={b.id} className="border-b border-app-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={index === 0 || busyId === b.id}
                      onClick={() => handleMove(list, index, -1)}
                      className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === list.length - 1 || busyId === b.id}
                      onClick={() => handleMove(list, index, 1)}
                      className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                {editId === b.id ? (
                  <>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-32 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="time"
                        value={editClosingTime}
                        onChange={(e) => setEditClosingTime(e.target.value)}
                        className="rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={b.is_active ? 'text-app-text' : 'text-app-text-faint'}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === b.id}
                          onClick={() => handleSaveEdit(b.id)}
                          className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => openEditor(b)}
                        className="text-left text-app-text hover:text-app-accent"
                        title="Click to edit"
                      >
                        {b.name}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => openEditor(b)}
                        className="text-app-text-muted hover:text-app-accent"
                        title="Click to edit"
                      >
                        {formatTime12h(b.closing_time)}
                      </button>
                    </td>
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
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
