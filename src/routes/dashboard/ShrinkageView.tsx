import { useShrinkageRows, useVarianceThresholds, effectiveThreshold } from './hooks'

export function ShrinkageView({ branchId, date }: { branchId: string | null; date: string }) {
  const rows = useShrinkageRows(branchId, date)
  const thresholds = useVarianceThresholds()

  const all = rows.data ?? []
  const closed = all.filter((r) => r.closed)
  const pendingCount = all.length - closed.length

  return (
    <div className="p-4">
      {pendingCount > 0 && (
        <p className="mb-3 text-sm text-app-text-muted">
          {pendingCount} product/branch combination{pendingCount === 1 ? '' : 's'} not closed out yet for this
          date — only closed items are shown below.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Carried in</th>
              <th className="px-3 py-2 text-right font-medium">Shipped</th>
              <th className="px-3 py-2 text-right font-medium">Available</th>
              <th className="px-3 py-2 text-right font-medium">Sold</th>
              <th className="px-3 py-2 text-right font-medium">Wasted</th>
              <th className="px-3 py-2 text-right font-medium">Carried out</th>
              <th className="px-3 py-2 text-right font-medium">Variance</th>
              <th className="px-4 py-2 font-medium">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {closed.map((r) => {
              const threshold = effectiveThreshold(thresholds.data?.shrinkage ?? new Map(), r.branchId)
              const flagged = threshold !== null && r.variance !== null && Math.abs(r.variance) > threshold
              return (
                <tr key={`${r.branchId}:${r.productId}`} className="border-b border-app-border last:border-b-0">
                  <td className="px-4 py-2.5 text-app-text">{r.branchName}</td>
                  <td className="px-3 py-2.5 text-app-text">{r.productLabel}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.carryoverIn}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.shippedIn}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.available}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.sold}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.wasted}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.carryoverOut}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${flagged ? 'text-app-error' : 'text-app-text'}`}>
                    {r.variance}
                    {flagged && <span className="ml-1">⚠</span>}
                  </td>
                  <td className="px-4 py-2.5 text-app-text-muted">{r.explanation ?? '—'}</td>
                </tr>
              )
            })}
            {closed.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-app-text-muted">
                  No closed-out products for this date yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
