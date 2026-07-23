import { useShrinkageData, useVarianceThresholds, effectiveThreshold, type BranchRef } from './hooks'

export function ShrinkageView({
  branches,
  branchId,
  date,
}: {
  branches: BranchRef[]
  branchId: string | null
  date: string
}) {
  const data = useShrinkageData(branchId, date)
  const thresholds = useVarianceThresholds()
  const visibleBranches = branches.filter((b) => !branchId || b.id === branchId)
  const products = data.data?.products ?? []
  const entriesByKey = data.data?.entriesByKey

  const closedRows: { branch: BranchRef; product: (typeof products)[number] }[] = []
  let pendingCount = 0
  for (const b of visibleBranches) {
    for (const p of products) {
      if (entriesByKey?.has(`${b.id}:${p.id}`)) {
        closedRows.push({ branch: b, product: p })
      } else {
        pendingCount++
      }
    }
  }

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
            {closedRows.map(({ branch: b, product: p }) => {
              const e = entriesByKey!.get(`${b.id}:${p.id}`)!
              const threshold = effectiveThreshold(thresholds.data?.shrinkage ?? new Map(), b.id)
              const flagged = threshold !== null && Math.abs(e.variance) > threshold
              return (
                <tr key={`${b.id}:${p.id}`} className="border-b border-app-border last:border-b-0">
                  <td className="px-4 py-2.5 text-app-text">{b.name}</td>
                  <td className="px-3 py-2.5 text-app-text">{p.label}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{e.carryoverIn}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{e.shippedIn}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{e.available}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{e.sold}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{e.wasted}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{e.carryoverOut}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${flagged ? 'text-app-error' : 'text-app-text'}`}>
                    {e.variance}
                    {flagged && <span className="ml-1">⚠</span>}
                  </td>
                  <td className="px-4 py-2.5 text-app-text-muted">{e.explanation ?? '—'}</td>
                </tr>
              )
            })}
            {closedRows.length === 0 && (
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
