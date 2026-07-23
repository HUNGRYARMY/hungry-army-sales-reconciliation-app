import { useState } from 'react'
import { getBusinessDate } from '../../lib/businessDate'
import { useFlavorBreakdown } from './hooks'

function peso(n: number) {
  return `₱${n.toFixed(2)}`
}

function firstOfMonth() {
  const today = getBusinessDate()
  return `${today.slice(0, 7)}-01`
}

export function FlavorBreakdownView({ branchId }: { branchId: string | null }) {
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(getBusinessDate)
  const breakdown = useFlavorBreakdown(branchId, startDate, endDate)

  const rows = breakdown.data?.rows ?? []
  const totalUnits = rows.reduce((sum, r) => sum + r.unitsTotal, 0)
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0)

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-app-text-muted">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-app-border bg-app-bg px-2 py-1.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-app-text-muted">To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-app-border bg-app-bg px-2 py-1.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-app-border bg-app-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
              <th className="px-4 py-2 font-medium">Flavor</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 text-right font-medium">Units (direct)</th>
              <th className="px-3 py-2 text-right font-medium">Units (via bundles)</th>
              <th className="px-3 py-2 text-right font-medium">Total units</th>
              <th className="px-4 py-2 text-right font-medium">Revenue (direct sales)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const startsJuniorGroup = r.size === 'junior' && rows[i - 1]?.size === 'regular'
              return (
                <tr
                  key={`${r.flavorName}__${r.size}`}
                  className={`border-b border-app-border last:border-b-0 ${startsJuniorGroup ? 'border-t-2 border-t-app-border' : ''}`}
                >
                  <td className="px-4 py-2.5 text-app-text">{r.flavorName}</td>
                  <td className="px-3 py-2.5 text-app-text-muted">{r.size === 'regular' ? 'Regular' : 'Junior'}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.unitsDirect}</td>
                  <td className="px-3 py-2.5 text-right text-app-text-muted">{r.unitsViaBundles}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-app-text">{r.unitsTotal}</td>
                  <td className="px-4 py-2.5 text-right text-app-text-muted">{peso(r.revenue)}</td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-app-text-muted">
                  No sales in this range.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-app-border text-sm font-medium">
                <td className="px-4 py-2.5 text-app-text">Total</td>
                <td />
                <td />
                <td />
                <td className="px-3 py-2.5 text-right text-app-text">{totalUnits}</td>
                <td className="px-4 py-2.5 text-right text-app-text">{peso(totalRevenue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {breakdown.data && breakdown.data.bundleCount > 0 && (
        <p className="mt-3 text-xs text-app-text-faint">
          Plus {breakdown.data.bundleCount} bundle{breakdown.data.bundleCount === 1 ? '' : 's'} sold ({peso(breakdown.data.bundleRevenue)}{' '}
          revenue) — units credited above, revenue not split per flavor since bundles are flat-priced.
        </p>
      )}
    </div>
  )
}
