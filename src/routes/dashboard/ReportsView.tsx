import { useState } from 'react'
import { startOfMonth, endOfMonth, format, parse } from 'date-fns'
import Papa from 'papaparse'
import { usePeriodSummary, type BranchRef } from './hooks'
import { getBusinessDate } from '../../lib/businessDate'

type PeriodMode = 'day' | 'month'

function peso(n: number) {
  return `₱${n.toFixed(2)}`
}

function getMonthRange(monthStr: string): { start: string; end: string } {
  const parsed = parse(monthStr, 'yyyy-MM', new Date())
  return { start: format(startOfMonth(parsed), 'yyyy-MM-dd'), end: format(endOfMonth(parsed), 'yyyy-MM-dd') }
}

export function ReportsView({
  branches,
  branchId,
  onBranchChange,
}: {
  branches: BranchRef[]
  branchId: string | null
  onBranchChange: (id: string | null) => void
}) {
  const [mode, setMode] = useState<PeriodMode>('day')
  const [day, setDay] = useState(getBusinessDate)
  const [month, setMonth] = useState(() => getBusinessDate().slice(0, 7))

  const { start, end } = mode === 'day' ? { start: day, end: day } : getMonthRange(month)
  const summary = usePeriodSummary(start, end, branchId)
  const visibleBranches = branches.filter((b) => !branchId || b.id === branchId)
  const byBranch = new Map((summary.data ?? []).map((r) => [r.branchId, r]))

  const totals = (summary.data ?? []).reduce(
    (acc, r) => ({
      grossSalesRevenue: acc.grossSalesRevenue + r.grossSalesRevenue,
      cashVariance: acc.cashVariance + r.cashVariance,
      shrinkageUnits: acc.shrinkageUnits + r.shrinkageUnits,
    }),
    { grossSalesRevenue: 0, cashVariance: 0, shrinkageUnits: 0 },
  )

  function handleExportCsv() {
    const rows = visibleBranches.map((b) => {
      const r = byBranch.get(b.id)
      return {
        Branch: b.name,
        'Gross Sales Revenue': (r?.grossSalesRevenue ?? 0).toFixed(2),
        'Cash Counted': (r?.cashCounted ?? 0).toFixed(2),
        'Digital Payments': (r?.digitalPayments ?? 0).toFixed(2),
        'Reported Total': (r?.reportedTotal ?? 0).toFixed(2),
        'Computed Gross Sales': (r?.computedGrossSales ?? 0).toFixed(2),
        'Cash Variance': (r?.cashVariance ?? 0).toFixed(2),
        'Cash Days Submitted': `${r?.cashDaysSubmitted ?? 0}/${r?.periodDays ?? 0}`,
        'Shrinkage (units)': r?.shrinkageUnits ?? 0,
        'Shrinkage Flagged': r?.shrinkageFlaggedCount ?? 0,
        'Shrinkage Explained': r?.shrinkageExplainedCount ?? 0,
      }
    })
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const label = mode === 'day' ? day : month
    a.href = url
    a.download = `hungry-army-report-${mode}-${label}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-app-border bg-app-sidebar px-4 py-3 text-base print:hidden">
        <label className="flex items-center gap-2">
          <span className="text-sm text-app-text-muted">Branch</span>
          <select
            value={branchId ?? 'all'}
            onChange={(e) => onBranchChange(e.target.value === 'all' ? null : e.target.value)}
            className="rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-base text-app-text outline-none focus:border-app-accent"
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex overflow-hidden rounded-md border border-app-border">
          <button
            type="button"
            onClick={() => setMode('day')}
            className={`px-4 py-2.5 text-base ${mode === 'day' ? 'bg-app-accent text-white' : 'text-app-text-muted hover:text-app-text'}`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setMode('month')}
            className={`px-4 py-2.5 text-base ${mode === 'month' ? 'bg-app-accent text-white' : 'text-app-text-muted hover:text-app-text'}`}
          >
            Month
          </button>
        </div>

        {mode === 'day' ? (
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-base text-app-text outline-none focus:border-app-accent"
          />
        ) : (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-base text-app-text outline-none focus:border-app-accent"
          />
        )}

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-app-border px-4 py-2.5 text-base text-app-text-muted hover:border-app-accent hover:text-app-text"
          >
            Print
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md bg-app-accent px-4 py-2.5 text-base font-medium text-white hover:bg-app-accent-hover"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-4 hidden print:block">
        <h1 className="text-lg font-semibold">Hungry Army — {mode === 'day' ? 'Daily' : 'Monthly'} Report</h1>
        <p className="text-sm text-app-text-muted">
          {mode === 'day' ? day : format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy')}
          {' · '}
          {branchId ? branches.find((b) => b.id === branchId)?.name : 'All branches'}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
          <div className="text-xs text-app-text-muted">Gross Sales Revenue</div>
          <div className="mt-1 text-xl font-semibold text-app-text">{peso(totals.grossSalesRevenue)}</div>
        </div>
        <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
          <div className="text-xs text-app-text-muted">Cash Variance</div>
          <div className={`mt-1 text-xl font-semibold ${totals.cashVariance !== 0 ? 'text-app-error' : 'text-app-text'}`}>
            {peso(totals.cashVariance)}
          </div>
        </div>
        <div className="rounded-lg border border-app-border bg-app-sidebar p-4">
          <div className="text-xs text-app-text-muted">Shrinkage (units)</div>
          <div className={`mt-1 text-xl font-semibold ${totals.shrinkageUnits !== 0 ? 'text-app-error' : 'text-app-text'}`}>
            {totals.shrinkageUnits}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 text-right font-medium">Gross Sales</th>
              <th className="px-3 py-2 text-right font-medium">Cash</th>
              <th className="px-3 py-2 text-right font-medium">Digital</th>
              <th className="px-3 py-2 text-right font-medium">Reported</th>
              <th className="px-3 py-2 text-right font-medium">Computed Sales</th>
              <th className="px-3 py-2 text-right font-medium">Cash Variance</th>
              <th className="px-3 py-2 text-right font-medium">Cash Days</th>
              <th className="px-3 py-2 text-right font-medium">Shrinkage</th>
              <th className="px-4 py-2 text-right font-medium">Shrinkage Explained</th>
            </tr>
          </thead>
          <tbody>
            {visibleBranches.map((b) => {
              const r = byBranch.get(b.id)
              return (
                <tr key={b.id} className="border-b border-app-border last:border-b-0">
                  <td className="px-4 py-2.5 text-app-text">{b.name}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r?.grossSalesRevenue ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r?.cashCounted ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r?.digitalPayments ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r?.reportedTotal ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r?.computedGrossSales ?? 0)}</td>
                  <td
                    className={`px-3 py-2.5 text-right font-medium ${
                      (r?.cashVariance ?? 0) !== 0 ? 'text-app-error' : 'text-app-text'
                    }`}
                  >
                    {peso(r?.cashVariance ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">
                    {r?.cashDaysSubmitted ?? 0}/{r?.periodDays ?? 0}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-medium ${
                      (r?.shrinkageUnits ?? 0) !== 0 ? 'text-app-error' : 'text-app-text'
                    }`}
                  >
                    {r?.shrinkageUnits ?? 0}
                  </td>
                  <td className="px-4 py-2.5 text-right text-app-text-muted">
                    {r?.shrinkageExplainedCount ?? 0}/{r?.shrinkageFlaggedCount ?? 0}
                  </td>
                </tr>
              )
            })}
            {visibleBranches.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-app-text-muted">
                  No branches to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-app-text-faint print:hidden">
        "Cash Days" is how many days in this period had a cash entry submitted, out of the total days in
        the period. "Shrinkage Explained" is how many flagged shrinkage rows already have an explanation,
        out of how many were flagged.
      </p>
    </div>
  )
}
