import { useState } from 'react'
import {
  useAllPromosAdmin,
  insertPromo,
  updatePromoStatus,
  updatePromoDetails,
  reorderPromos,
  useInvalidateAdmin,
} from './hooks'
import { getErrorMessage } from '../../../lib/errorMessage'
import type { Promo } from '../../../types/domain'

export function PromosAdmin() {
  const promos = useAllPromosAdmin()
  const invalidate = useInvalidateAdmin()

  const [name, setName] = useState('')
  const [ratePercent, setRatePercent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRatePercent, setEditRatePercent] = useState('')

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
      setError(getErrorMessage(e))
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
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  function openEditor(p: Promo) {
    setEditId(p.id)
    setEditName(p.name)
    setEditRatePercent(String(Math.round(p.rate * 100)))
  }

  async function handleSaveEdit(id: string) {
    const rate = Number(editRatePercent) / 100
    if (!editName.trim() || !Number.isFinite(rate) || rate < 0 || rate > 1) {
      setError('Enter a name and a rate between 0 and 100')
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await updatePromoDetails(id, { name: editName.trim(), rate })
      setEditId(null)
      invalidate('admin-promos')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleMove(group: Promo[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= group.length) return
    const reordered = [...group]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setBusyId(reordered[index].id)
    setError(null)
    try {
      await reorderPromos(reordered.map((p) => p.id))
      invalidate('admin-promos')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  function renderRow(p: Promo, index: number, group: Promo[], reorderable: boolean) {
    if (editId === p.id) {
      return (
        <tr key={p.id} className="border-b border-app-border last:border-b-0">
          {reorderable && <td className="px-4 py-2.5" />}
          <td className="px-4 py-2.5">
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-32 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
            />
          </td>
          <td className="px-3 py-2.5 text-right">
            <input
              type="number"
              min={0}
              max={100}
              value={editRatePercent}
              onChange={(e) => setEditRatePercent(e.target.value)}
              className="w-16 rounded-md border border-app-border bg-app-bg px-2 py-1 text-right text-xs text-app-text outline-none focus:border-app-accent"
            />
          </td>
          <td className="px-3 py-2.5">
            <span className={p.status === 'active' ? 'text-app-text' : 'text-app-text-faint'}>
              {p.status === 'active' ? 'Active' : 'Discontinued'}
            </span>
          </td>
          <td className="px-4 py-2.5">
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                disabled={busyId === p.id}
                onClick={() => handleSaveEdit(p.id)}
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
        </tr>
      )
    }
    return (
      <tr key={p.id} className="border-b border-app-border last:border-b-0">
        {reorderable && (
          <td className="px-4 py-2.5">
            <div className="flex gap-1">
              <button
                type="button"
                disabled={index === 0 || busyId === p.id}
                onClick={() => handleMove(group, index, -1)}
                className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === group.length - 1 || busyId === p.id}
                onClick={() => handleMove(group, index, 1)}
                className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
            </div>
          </td>
        )}
        <td className="px-4 py-2.5">
          <button
            type="button"
            onClick={() => openEditor(p)}
            className="text-left text-app-text hover:text-app-accent"
            title="Click to edit"
          >
            {p.name}
          </button>
        </td>
        <td className="px-3 py-2.5 text-right">
          <button
            type="button"
            onClick={() => openEditor(p)}
            className="text-app-text-muted hover:text-app-accent"
            title="Click to edit"
          >
            {Math.round(p.rate * 100)}%
          </button>
        </td>
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
    )
  }

  function renderGroup(title: string, group: Promo[], reorderable: boolean) {
    if (group.length === 0) return null
    return (
      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <h3 className="border-b border-app-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-app-text-muted">
          {title}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              {reorderable && <th className="px-4 py-2 font-medium">Order</th>}
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>{group.map((p, index) => renderRow(p, index, group, reorderable))}</tbody>
        </table>
      </div>
    )
  }

  const all = promos.data ?? []
  const active = all.filter((p) => p.status === 'active')
  const discontinued = all.filter((p) => p.status === 'discontinued')

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
        <p className="mt-2 text-xs text-app-text-faint">
          Click a name or rate to edit it. Use ↑/↓ to reorder active promos.
        </p>
      </div>

      <div className="space-y-4">
        {renderGroup('Active', active, true)}
        {renderGroup('Discontinued', discontinued, false)}
        {all.length === 0 && (
          <div className="rounded-lg border border-app-border bg-app-sidebar px-4 py-6 text-center text-app-text-muted">
            No promos yet.
          </div>
        )}
      </div>
    </div>
  )
}
