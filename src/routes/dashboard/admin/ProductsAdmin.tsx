import { useState } from 'react'
import { getBusinessDate } from '../../../lib/businessDate'
import {
  useAllProductsAdmin,
  insertProduct,
  updateProductStatus,
  updateProductName,
  insertPrice,
  useInvalidateAdmin,
} from './hooks'
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
      setError(e instanceof Error ? e.message : String(e))
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
      setError(e instanceof Error ? e.message : String(e))
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
      setError(e instanceof Error ? e.message : String(e))
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
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
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
          New products need a price added before they can be sold — the trigger that stamps sale prices
          requires a price_history row. Click a flavor name in the table to rename it — unlike price, this
          applies retroactively to past reports too, since they reference the same product record.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Flavor</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Current price</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(products.data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-app-border last:border-b-0">
                <td className="px-4 py-2.5 text-app-text">
                  {nameEditId === p.id ? (
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
                  ) : (
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
                  )}
                </td>
                <td className="px-3 py-2.5 text-app-text-muted">{p.size}</td>
                <td className="px-3 py-2.5">
                  <span className={p.status === 'active' ? 'text-app-text' : 'text-app-text-faint'}>
                    {p.status === 'active' ? 'Active' : 'Discontinued'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-app-text-muted">
                  {p.currentPrice !== null ? `₱${p.currentPrice.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {priceEditId === p.id ? (
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
                  ) : (
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openPriceEditor(p.id, p.currentPrice)}
                        className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text"
                      >
                        Update price
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleToggleStatus(p.id, p.status)}
                        className="rounded-md border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text disabled:opacity-50"
                      >
                        {p.status === 'active' ? 'Discontinue' : 'Reactivate'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
