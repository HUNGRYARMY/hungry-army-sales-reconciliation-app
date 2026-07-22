import { useCashVarianceRows, useVarianceThresholds, effectiveThreshold } from './hooks'

function peso(n: number | null) {
  return n === null ? '—' : `₱${n.toFixed(2)}`
}

export function CashVarianceView({ branchId, date }: { branchId: string | null; date: string }) {
  const rows = useCashVarianceRows(branchId, date)
  const thresholds = useVarianceThresholds()

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
            {(rows.data ?? []).map((r) => {
              const threshold = effectiveThreshold(thresholds.data?.cashVariance ?? new Map(), r.branchId)
              const flagged =
                r.submitted && threshold !== null && r.variance !== null && Math.abs(r.variance) > threshold
              return (
                <tr key={r.branchId} className="border-b border-app-border last:border-b-0">
                  <td className="px-4 py-2.5 text-app-text">{r.branchName}</td>
                  {!r.submitted ? (
                    <td colSpan={6} className="px-3 py-2.5 text-app-text-faint">
                      Not submitted yet for this date
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r.cashCounted)}</td>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r.digitalPayments)}</td>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r.reportedTotal)}</td>
                      <td className="px-3 py-2.5 text-right text-app-text-muted">{peso(r.computedGrossSales)}</td>
                      <td
                        className={`px-3 py-2.5 text-right font-medium ${flagged ? 'text-app-error' : 'text-app-text'}`}
                      >
                        {peso(r.variance)}
                        {flagged && <span className="ml-1">⚠</span>}
                      </td>
                      <td className="px-4 py-2.5 text-app-text-muted">{r.explanation ?? '—'}</td>
                    </>
                  )}
                </tr>
              )
            })}
            {(rows.data ?? []).length === 0 && (
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
