import { useCashVarianceEntries, useVarianceThresholds, effectiveThreshold, type BranchRef } from './hooks'

function peso(n: number | null | undefined) {
  return n === null || n === undefined ? '—' : `₱${n.toFixed(2)}`
}

export function CashVarianceView({
  branches,
  branchId,
  date,
}: {
  branches: BranchRef[]
  branchId: string | null
  date: string
}) {
  const entries = useCashVarianceEntries(branchId, date)
  const thresholds = useVarianceThresholds()
  const visibleBranches = branches.filter((b) => !branchId || b.id === branchId)

  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 text-right font-medium">Cash</th>
              <th className="px-3 py-2 text-right font-medium">Digital</th>
              <th className="px-3 py-2 text-right font-medium">Reported</th>
              <th className="px-3 py-2 text-right font-medium">Computed sales</th>
              <th className="px-3 py-2 text-right font-medium">Variance</th>
              <th className="px-4 py-2 font-medium">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {visibleBranches.map((b) => {
              const e = entries.data?.get(b.id)
              const threshold = effectiveThreshold(thresholds.data?.cashVariance ?? new Map(), b.id)
              const flagged = !!e && threshold !== null && Math.abs(e.variance) > threshold
              return (
                <tr key={b.id} className="border-b border-app-border last:border-b-0">
                  <td className="px-4 py-2.5 text-app-text">{b.name}</td>
                  {!e ? (
                    <td colSpan={6} className="px-3 py-2.5 text-app-text-faint">
                      Not submitted yet for this date
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(e.cashCounted)}</td>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(e.digitalPayments)}</td>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(e.reportedTotal)}</td>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(e.computedGrossSales)}</td>
                      <td
                        className={`px-3 py-2.5 text-right font-medium ${flagged ? 'text-app-error' : 'text-app-text'}`}
                      >
                        {peso(e.variance)}
                        {flagged && <span className="ml-1">⚠</span>}
                      </td>
                      <td className="px-4 py-2.5 text-app-text-muted">{e.explanation ?? '—'}</td>
                    </>
                  )}
                </tr>
              )
            })}
            {visibleBranches.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-app-text-muted">
                  No branches to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
