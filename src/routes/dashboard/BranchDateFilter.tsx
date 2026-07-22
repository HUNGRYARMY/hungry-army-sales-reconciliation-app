import type { Branch } from '../../types/domain'

interface Props {
  branches: Branch[]
  branchId: string | null
  onBranchChange: (id: string | null) => void
  date: string
  onDateChange: (date: string) => void
}

export function BranchDateFilter({ branches, branchId, onBranchChange, date, onDateChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-app-border bg-app-sidebar px-4 py-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-app-text-muted">Branch</span>
        <select
          value={branchId ?? 'all'}
          onChange={(e) => onBranchChange(e.target.value === 'all' ? null : e.target.value)}
          className="rounded-md border border-app-border bg-app-bg px-2 py-1.5 text-app-text outline-none focus:border-app-accent"
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-app-text-muted">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-md border border-app-border bg-app-bg px-2 py-1.5 text-app-text outline-none focus:border-app-accent"
        />
      </label>
    </div>
  )
}
