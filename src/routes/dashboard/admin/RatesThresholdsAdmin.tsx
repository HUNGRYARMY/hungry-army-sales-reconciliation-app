import { useState } from 'react'
import { useAllBranches } from '../../../lib/queries/branches'
import {
  useDiscountSettings,
  updateDiscountRate,
  useAllThresholdsAdmin,
  upsertThreshold,
  deleteThreshold,
  useInvalidateAdmin,
} from './hooks'
import { getErrorMessage } from '../../../lib/errorMessage'

const EDITABLE_DISCOUNT_TYPES = ['senior', 'pwd']

export function RatesThresholdsAdmin() {
  const discountSettings = useDiscountSettings()
  const thresholds = useAllThresholdsAdmin()
  const branches = useAllBranches()
  const invalidate = useInvalidateAdmin()

  const [editingRateType, setEditingRateType] = useState<string | null>(null)
  const [rateValue, setRateValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [editingThresholdKey, setEditingThresholdKey] = useState<string | null>(null)
  const [thresholdValue, setThresholdValue] = useState('')

  const [newOverrideBranch, setNewOverrideBranch] = useState('')
  const [newOverrideMetric, setNewOverrideMetric] = useState<'cash_variance' | 'shrinkage'>('cash_variance')
  const [newOverrideValue, setNewOverrideValue] = useState('')

  async function handleSaveRate(discountType: string) {
    const pct = Number(rateValue)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError('Enter a rate between 0 and 100')
      return
    }
    try {
      await updateDiscountRate(discountType, pct / 100)
      setEditingRateType(null)
      invalidate('admin-discount-settings')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleSaveThreshold(branchId: string | null, metric: 'cash_variance' | 'shrinkage') {
    const num = Number(thresholdValue)
    if (!Number.isFinite(num) || num < 0) {
      setError('Enter a valid threshold value')
      return
    }
    try {
      await upsertThreshold(branchId, metric, num)
      setEditingThresholdKey(null)
      invalidate('admin-thresholds')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleAddOverride() {
    const num = Number(newOverrideValue)
    if (!newOverrideBranch || !Number.isFinite(num) || num < 0) {
      setError('Select a branch and enter a valid value')
      return
    }
    try {
      await upsertThreshold(newOverrideBranch, newOverrideMetric, num)
      setNewOverrideBranch('')
      setNewOverrideValue('')
      invalidate('admin-thresholds')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleDeleteOverride(id: string) {
    try {
      await deleteThreshold(id)
      invalidate('admin-thresholds')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const globalCash = thresholds.data?.find((t) => t.branch_id === null && t.metric === 'cash_variance')
  const globalShrinkage = thresholds.data?.find((t) => t.branch_id === null && t.metric === 'shrinkage')
  const overrides = (thresholds.data ?? []).filter((t) => t.branch_id !== null)

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-app-error">{error}</p>}

      <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-3 text-sm font-semibold text-app-text">Discount rates</h2>
        <ul className="space-y-2">
          {(discountSettings.data ?? []).map((d) => (
            <li key={d.discount_type} className="flex items-center gap-2 text-sm">
              <span className="w-32 text-app-text">{d.discount_type}</span>
              {editingRateType === d.discount_type ? (
                <>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                    className="w-20 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRate(d.discount_type)}
                    className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRateType(null)}
                    className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-app-text-muted">{Math.round(d.rate * 100)}%</span>
                  {EDITABLE_DISCOUNT_TYPES.includes(d.discount_type) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRateType(d.discount_type)
                        setRateValue(String(Math.round(d.rate * 100)))
                      }}
                      className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text"
                    >
                      Edit
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-3 text-sm font-semibold text-app-text">Global thresholds</h2>
        <ul className="space-y-2">
          {[
            { label: 'Cash variance (₱)', metric: 'cash_variance' as const, row: globalCash },
            { label: 'Shrinkage (units)', metric: 'shrinkage' as const, row: globalShrinkage },
          ].map(({ label, metric, row }) => {
            const key = `global:${metric}`
            return (
              <li key={key} className="flex items-center gap-2 text-sm">
                <span className="w-40 text-app-text">{label}</span>
                {editingThresholdKey === key ? (
                  <>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      className="w-24 rounded-md border border-app-border bg-app-bg px-2 py-1 text-xs text-app-text outline-none focus:border-app-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveThreshold(null, metric)}
                      className="rounded-md bg-app-accent px-2 py-1 text-xs font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingThresholdKey(null)}
                      className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-app-text-muted">{row ? row.threshold_value : 'not set'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingThresholdKey(key)
                        setThresholdValue(row ? String(row.threshold_value) : '')
                      }}
                      className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-accent hover:text-app-text"
                    >
                      Edit
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
        <h2 className="mb-3 text-sm font-semibold text-app-text">Per-branch overrides</h2>

        <ul className="mb-4 space-y-1.5">
          {overrides.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-app-text">
                {t.branch_name} — {t.metric === 'cash_variance' ? 'Cash variance' : 'Shrinkage'}
              </span>
              <span className="text-app-text-muted">{t.threshold_value}</span>
              <button
                type="button"
                onClick={() => handleDeleteOverride(t.id)}
                className="rounded-md border border-app-border px-2 py-1 text-xs text-app-text-muted hover:border-app-error hover:text-app-error"
              >
                Remove
              </button>
            </li>
          ))}
          {overrides.length === 0 && <li className="text-sm text-app-text-muted">No per-branch overrides.</li>}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newOverrideBranch}
            onChange={(e) => setNewOverrideBranch(e.target.value)}
            className="rounded-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
          >
            <option value="">Select branch…</option>
            {(branches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={newOverrideMetric}
            onChange={(e) => setNewOverrideMetric(e.target.value as 'cash_variance' | 'shrinkage')}
            className="rounded-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
          >
            <option value="cash_variance">Cash variance</option>
            <option value="shrinkage">Shrinkage</option>
          </select>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Value"
            value={newOverrideValue}
            onChange={(e) => setNewOverrideValue(e.target.value)}
            className="w-24 rounded-md border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
          />
          <button
            type="button"
            onClick={handleAddOverride}
            className="rounded-md bg-app-accent px-3 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
          >
            Add override
          </button>
        </div>
      </div>
    </div>
  )
}
