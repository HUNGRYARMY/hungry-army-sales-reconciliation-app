import { useState } from 'react'
import { setActiveBranch, type MyBranch } from './hooks'
import { getErrorMessage } from '../../lib/errorMessage'

// Only rendered when a staff member is assigned to more than one branch (see TabletHome) — single-branch
// staff never see this, nothing changes for them.
export function BranchSwitcher({
  branches,
  activeBranchId,
  onSwitched,
}: {
  branches: MyBranch[]
  activeBranchId: string | null
  onSwitched: () => Promise<void> | void
}) {
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(branchId: string) {
    if (branchId === activeBranchId) return
    setSwitching(true)
    setError(null)
    try {
      await setActiveBranch(branchId)
      await onSwitched()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-app-border bg-app-sidebar px-4 py-2.5 text-base">
      <span className="text-app-text-muted">Working at:</span>
      <select
        value={activeBranchId ?? ''}
        disabled={switching}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-base text-app-text outline-none focus:border-app-accent disabled:opacity-50"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {switching && <span className="text-sm text-app-text-faint">Switching…</span>}
      {error && <span className="text-sm text-app-error">{error}</span>}
    </div>
  )
}
