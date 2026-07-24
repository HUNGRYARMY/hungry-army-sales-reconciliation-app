import { useState } from 'react'
import { getBusinessDate } from '../../../lib/businessDate'
import {
  useAllProductsAdmin,
  insertProduct,
  updateProductStatus,
  updateProductName,
  updateProductSize,
  insertPrice,
  reorderProducts,
  useInvalidateAdmin,
  type ProductWithPrice,
} from './hooks'
import { getErrorMessage } from '../../../lib/errorMessage'
import type { ProductSize } from '../../../types/domain'

export function ProductsAdmin() {
  const products = useAllProductsAdmin()
  const invalidate = useInvalidateAdmin()

  const [flavorName, setFlavorName] = useState('')
  const [size, setSize] = useState<ProductSize>('regular')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [priceEditId, setPriceEditId] = useState<string | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [priceEffectiveDate, setPriceEffectiveDate] = useState(() => getBusinessDate())

  const [nameEditId, setNameEditId] = useState<string | null>(null)
  const [nameValue, setNameValue] = useState('')

  const [sizeEditId, setSizeEditId] = useState<string | null>(null)
  const [sizeValue, setSizeValue] = useState<ProductSize>('regular')

  async function handleAddProduct() {
    if (!flavorName.trim()) {
      setError('Flavor name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await insertProduct({ flavor_name: flavorName.trim(), size })
      setFlavorName('')
      invalidate('admin-products')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleStatus(id: string, status: string) {
    setBusyId(id)
    try {
      await updateProductStatus(id, status === 'active' ? 'discontinued' : 'active')
      invalidate('admin-products')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaveName(id: string) {
    if (!nameValue.trim()) {
      setError('Flavor name is required')
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await updateProductName(id, nameValue.trim())
      setNameEditId(null)
      invalidate('admin-products')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaveSize(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await updateProductSize(id, sizeValue)
      setSizeEditId(null)
      invalidate('admin-products')
    } catch (e) {
      const message = getErrorMessage(e)
      if (message.includes('products_flavor_name_size_key') || message.includes('duplicate key')) {
        setError(`A ${sizeValue} product with this same flavor name already exists — rename one of them first.`)
      } else {
        setError(message)
      }
    } finally {
      setBusyId(null)
    }
  }

  function openPriceEditor(id: string, currentPrice: number | null) {
    setPriceEditId(id)
    setPriceValue(currentPrice !== null ? String(currentPrice) : '')
    setPriceEffectiveDate(getBusinessDate())
  }

  async function handleSavePrice(id: string) {
    const num = Number(priceValue)
    if (!Number.isFinite(num) || num < 0) {
      setError('Enter a valid price')
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await insertPrice({ product_id: id, price: num, effective_date: priceEffectiveDate })
      setPriceEditId(null)
      invalidate('admin-products')
    } catch (e) {
      const message = getErrorMessage(e)
      if (message.includes('price_history_product_id_effective_date_key') || message.includes('duplicate key')) {
        setError(`A price was already set for ${priceEffectiveDate} — pick a different effective date, or this is a duplicate entry.`)
      } else {
        setError(message)
      }
    } finally {
      setBusyId(null)
    }
  }

  async function handleMove(group: ProductWithPrice[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= group.length) return
    const reordered = [...group]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setBusyId(reordered[index].id)
    setError(null)
    try {
      await reorderProducts(reordered.map((p) => p.id))
      invalidate('admin-products')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const all = products.data ?? []
  const activeRegular = all.filter((p) => p.status === 'active' && p.size === 'regular')
  const activeJunior = all.filter((p) => p.status === 'active' && p.size === 'junior')
  const discontinued = all.filter((p) => p.status === 'discontinued')

  function renderNameCell(p: ProductWithPrice) {
    if (nameEditId === p.id) {
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            className="w-32 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
          />
          <button
            type="button"
            disabled={busyId === p.id}
            onClick={() => handleSaveName(p.id)}
            className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setNameEditId(null)}
            className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted"
          >
            Cancel
          </button>
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={() => {
          setNameEditId(p.id)
          setNameValue(p.flavor_name)
        }}
        className="text-left hover:text-app-accent"
        title="Click to rename"
      >
        {p.flavor_name}
      </button>
    )
  }

  function renderSizeCell(p: ProductWithPrice) {
    if (sizeEditId === p.id) {
      return (
        <div className="flex items-center gap-1.5">
          <select
            autoFocus
            value={sizeValue}
            onChange={(e) => setSizeValue(e.target.value as ProductSize)}
            className="rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
          >
            <option value="regular">Regular</option>
            <option value="junior">Junior</option>
          </select>
          <button
            type="button"
            disabled={busyId === p.id}
            onClick={() => handleSaveSize(p.id)}
            className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setSizeEditId(null)}
            className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted"
          >
            Cancel
          </button>
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={() => {
          setSizeEditId(p.id)
          setSizeValue(p.size)
        }}
        className="text-xs text-app-text-muted hover:text-app-accent"
        title="Click to move to the other size group"
      >
        {p.size === 'regular' ? 'Regular' : 'Junior'} · change
      </button>
    )
  }

  function renderActionsCell(p: ProductWithPrice) {
    if (priceEditId === p.id) {
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            className="w-20 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
          />
          <input
            type="date"
            value={priceEffectiveDate}
            onChange={(e) => setPriceEffectiveDate(e.target.value)}
            className="rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
          />
          <button
            type="button"
            disabled={busyId === p.id}
            onClick={() => handleSavePrice(p.id)}
            className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setPriceEditId(null)}
            className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted"
          >
            Cancel
          </button>
        </div>
      )
    }
    return (
      <div className="flex justify-end gap-1.5">
        {p.status === 'active' && (
          <button
            type="button"
            onClick={() => openPriceEditor(p.id, p.currentPrice)}
            className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text"
          >
            Update price
          </button>
        )}
        <button
          type="button"
          disabled={busyId === p.id}
          onClick={() => handleToggleStatus(p.id, p.status)}
          className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-50"
        >
          {p.status === 'active' ? 'Discontinue' : 'Reactivate'}
        </button>
      </div>
    )
  }

  function renderGroup(title: string, group: ProductWithPrice[], reorderable: boolean) {
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
              <th className="px-4 py-2 font-medium">Flavor</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Current price</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {group.map((p, index) => (
              <tr key={p.id} className="border-b border-app-border last:border-b-0">
                {reorderable && (
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0 || busyId === p.id}
                        onClick={() => handleMove(group, index, -1)}
                        className="rounded-md border border-app-border px-3 py-2.5 text-sm text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === group.length - 1 || busyId === p.id}
                        onClick={() => handleMove(group, index, 1)}
                        className="rounded-md border border-app-border px-3 py-2.5 text-sm text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                )}
                <td className="px-4 py-2.5 text-app-text">{renderNameCell(p)}</td>
                <td className="px-3 py-2.5">{renderSizeCell(p)}</td>
                <td className="px-3 py-2.5">
                  <span className={p.status === 'active' ? 'text-app-text' : 'text-app-text-faint'}>
                    {p.status === 'active' ? 'Active' : 'Discontinued'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-app-text-muted">
                  {p.currentPrice !== null ? `₱${p.currentPrice.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2.5">{renderActionsCell(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="h-fit rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-4 text-sm font-semibold text-app-text">New product</h2>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-app-text-muted">Flavor name</span>
          <input
            type="text"
            value={flavorName}
            onChange={(e) => setFlavorName(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-app-text-muted">Size</span>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as ProductSize)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          >
            <option value="regular">Regular</option>
            <option value="junior">Junior</option>
          </select>
        </label>
        {error && <p className="mb-3 text-sm text-app-error">{error}</p>}
        <button
          type="button"
          disabled={submitting}
          onClick={handleAddProduct}
          className="w-full rounded-md bg-app-accent py-2.5 font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add product'}
        </button>
        <p className="mt-2 text-xs text-app-text-faint">
          New products need a price added before they can be sold. Click a flavor name to rename it, or
          "change" next to its size to move it to the other group (e.g. fix an accidental Standard/Junior
          mix-up) — both apply retroactively to past reports too, since they reference the same product
          record. Use ↑/↓ to reorder within Standard or Junior — flavors can only move within their own size
          group via the arrows, never directly into the other one.
        </p>
      </div>

      <div className="space-y-4">
        {renderGroup('Standard flavors', activeRegular, true)}
        {renderGroup('Junior flavors', activeJunior, true)}
        {renderGroup('Discontinued', discontinued, false)}
      </div>
    </div>
  )
}
