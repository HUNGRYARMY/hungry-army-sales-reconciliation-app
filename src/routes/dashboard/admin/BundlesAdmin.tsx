import { useState } from 'react'
import {
  useAllBundlesAdmin,
  insertBundle,
  updateBundleStatus,
  updateBundleDetails,
  reorderBundles,
  useBundleComponents,
  insertBundleComponent,
  updateBundleComponentQty,
  useAllProductsAdmin,
  useInvalidateAdmin,
} from './hooks'
import { getErrorMessage } from '../../../lib/errorMessage'
import type { Bundle } from '../../../types/domain'

export function BundlesAdmin() {
  const bundles = useAllBundlesAdmin()
  const products = useAllProductsAdmin()
  const invalidate = useInvalidateAdmin()

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')

  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null)
  const components = useBundleComponents(selectedBundleId)
  const [newComponentProductId, setNewComponentProductId] = useState('')
  const [newComponentQty, setNewComponentQty] = useState('1')
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null)
  const [editingQty, setEditingQty] = useState('')

  async function handleAddBundle() {
    const priceNum = Number(price)
    if (!name.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
      setError('Enter a name and a valid price')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await insertBundle({ name: name.trim(), price: priceNum })
      setName('')
      setPrice('')
      invalidate('admin-bundles')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleBundle(id: string, status: string) {
    setBusyId(id)
    try {
      await updateBundleStatus(id, status === 'active' ? 'discontinued' : 'active')
      invalidate('admin-bundles')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  function openEditor(b: Bundle) {
    setEditId(b.id)
    setEditName(b.name)
    setEditPrice(String(b.price))
  }

  async function handleSaveEdit(id: string) {
    const priceNum = Number(editPrice)
    if (!editName.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
      setError('Enter a name and a valid price')
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await updateBundleDetails(id, { name: editName.trim(), price: priceNum })
      setEditId(null)
      invalidate('admin-bundles')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleAddComponent() {
    const qty = Number(newComponentQty)
    if (!selectedBundleId || !newComponentProductId || !Number.isInteger(qty) || qty <= 0) {
      setError('Select a product and a valid quantity')
      return
    }
    setError(null)
    try {
      await insertBundleComponent({ bundle_id: selectedBundleId, product_id: newComponentProductId, qty_per_bundle: qty })
      setNewComponentProductId('')
      setNewComponentQty('1')
      invalidate('admin-bundle-components')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleSaveQty(componentId: string) {
    const qty = Number(editingQty)
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Enter a valid quantity')
      return
    }
    try {
      await updateBundleComponentQty(componentId, qty)
      setEditingComponentId(null)
      invalidate('admin-bundle-components')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleMove(group: Bundle[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= group.length) return
    const reordered = [...group]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setBusyId(reordered[index].id)
    setError(null)
    try {
      await reorderBundles(reordered.map((b) => b.id))
      invalidate('admin-bundles')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const activeProducts = (products.data ?? []).filter((p) => p.status === 'active')

  function renderRow(b: Bundle, index: number, group: Bundle[], reorderable: boolean) {
    if (editId === b.id) {
      return (
        <tr key={b.id} className="border-b border-app-border last:border-b-0">
          {reorderable && <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()} />}
          <td className="px-4 py-2.5">
            <input
              type="text"
              autoFocus
              value={editName}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditName(e.target.value)}
              className="w-32 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
            />
          </td>
          <td className="px-3 py-2.5 text-right">
            <input
              type="number"
              min={0}
              step="0.01"
              value={editPrice}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-20 rounded-md border border-app-border bg-app-bg px-2 py-1 text-right text-xs text-app-text outline-none focus:border-app-accent"
            />
          </td>
          <td className="px-3 py-2.5">
            <span className={b.status === 'active' ? 'text-app-text' : 'text-app-text-faint'}>
              {b.status === 'active' ? 'Active' : 'Discontinued'}
            </span>
          </td>
          <td className="px-4 py-2.5">
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                disabled={busyId === b.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveEdit(b.id)
                }}
                className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditId(null)
                }}
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
      <tr
        key={b.id}
        onClick={() => setSelectedBundleId(b.id)}
        className={`cursor-pointer border-b border-app-border last:border-b-0 ${
          selectedBundleId === b.id ? 'bg-app-accent/10' : ''
        }`}
      >
        {reorderable && (
          <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={index === 0 || busyId === b.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleMove(group, index, -1)
                }}
                className="rounded-md border border-app-border px-3 py-2.5 text-sm text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === group.length - 1 || busyId === b.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleMove(group, index, 1)
                }}
                className="rounded-md border border-app-border px-3 py-2.5 text-sm text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
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
            onClick={(e) => {
              e.stopPropagation()
              openEditor(b)
            }}
            className="text-left text-app-text hover:text-app-accent"
            title="Click to edit"
          >
            {b.name}
          </button>
        </td>
        <td className="px-3 py-2.5 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openEditor(b)
            }}
            className="text-app-text-muted hover:text-app-accent"
            title="Click to edit"
          >
            ₱{Number(b.price).toFixed(2)}
          </button>
        </td>
        <td className="px-3 py-2.5">
          <span className={b.status === 'active' ? 'text-app-text' : 'text-app-text-faint'}>
            {b.status === 'active' ? 'Active' : 'Discontinued'}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right">
          <button
            type="button"
            disabled={busyId === b.id}
            onClick={(e) => {
              e.stopPropagation()
              handleToggleBundle(b.id, b.status)
            }}
            className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-50"
          >
            {b.status === 'active' ? 'Discontinue' : 'Reactivate'}
          </button>
        </td>
      </tr>
    )
  }

  function renderGroup(title: string, group: Bundle[], reorderable: boolean) {
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
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>{group.map((b, index) => renderRow(b, index, group, reorderable))}</tbody>
        </table>
      </div>
    )
  }

  const all = bundles.data ?? []
  const active = all.filter((b) => b.status === 'active')
  const discontinued = all.filter((b) => b.status === 'discontinued')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="h-fit rounded-lg border border-app-border bg-app-sidebar p-4">
          <h2 className="mb-4 text-sm font-semibold text-app-text">New bundle</h2>
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
            <span className="mb-1 block text-app-text-muted">Price</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
            />
          </label>
          {error && <p className="mb-3 text-sm text-app-error">{error}</p>}
          <button
            type="button"
            disabled={submitting}
            onClick={handleAddBundle}
            className="w-full rounded-md bg-app-accent py-2.5 font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Add bundle'}
          </button>
          <p className="mt-2 text-xs text-app-text-faint">
            Click a name or price to edit it. Click a row to manage its components below. Use ↑/↓ to reorder active bundles.
          </p>
        </div>

        <div className="space-y-4">
          {renderGroup('Active', active, true)}
          {renderGroup('Discontinued', discontinued, false)}
          {all.length === 0 && (
            <div className="rounded-lg border border-app-border bg-app-sidebar px-4 py-6 text-center text-app-text-muted">
              No bundles yet.
            </div>
          )}
        </div>
      </div>

      {selectedBundleId && (
        <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
          <h2 className="mb-3 text-sm font-semibold text-app-text">
            Components — {bundles.data?.find((b) => b.id === selectedBundleId)?.name}
          </h2>

          <ul className="mb-4 space-y-1.5">
            {(components.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-app-text">{c.productLabel}</span>
                {editingComponentId === c.id ? (
                  <>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={editingQty}
                      onChange={(e) => setEditingQty(e.target.value)}
                      className="w-16 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveQty(c.id)}
                      className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingComponentId(null)}
                      className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-app-text-muted">× {c.qtyPerBundle}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingComponentId(c.id)
                        setEditingQty(String(c.qtyPerBundle))
                      }}
                      className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text"
                    >
                      Edit qty
                    </button>
                  </>
                )}
              </li>
            ))}
            {(components.data ?? []).length === 0 && (
              <li className="text-sm text-app-text-muted">No components yet — add one below.</li>
            )}
          </ul>

          <div className="flex items-center gap-2">
            <select
              value={newComponentProductId}
              onChange={(e) => setNewComponentProductId(e.target.value)}
              className="flex-1 rounded-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
            >
              <option value="">Select product…</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.flavor_name} ({p.size})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              step="1"
              value={newComponentQty}
              onChange={(e) => setNewComponentQty(e.target.value)}
              className="w-20 rounded-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
            />
            <button
              type="button"
              onClick={handleAddComponent}
              className="rounded-md bg-app-accent px-3 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
            >
              Add component
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
