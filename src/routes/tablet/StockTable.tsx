import type { BranchTodayStockRow } from '../../types/domain'

const SIZE_LABEL: Record<string, string> = { regular: 'Regular', junior: 'Junior' }

export function StockTable({ rows }: { rows: BranchTodayStockRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-app-text-muted">No active products.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app-border text-left text-xs text-app-text-muted">
            <th className="px-4 py-2 font-medium">Product</th>
            <th className="px-3 py-2 text-right font-medium">Carried over</th>
            <th className="px-3 py-2 text-right font-medium">Shipped today</th>
            <th className="px-3 py-2 text-right font-medium">Available</th>
            <th className="px-3 py-2 text-right font-medium">Sold today</th>
            <th className="px-4 py-2 text-right font-medium">Remaining (est.)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product_id} className="border-b border-app-border last:border-b-0">
              <td className="px-4 py-2.5 text-app-text">
                {r.flavor_name} <span className="text-app-text-muted">({SIZE_LABEL[r.size] ?? r.size})</span>
              </td>
              <td className="px-3 py-2.5 text-right text-app-text-muted">{r.carryover_in}</td>
              <td className="px-3 py-2.5 text-right text-app-text-muted">{r.shipped_in}</td>
              <td className="px-3 py-2.5 text-right font-medium text-app-text">{r.available}</td>
              <td className="px-3 py-2.5 text-right text-app-text-muted">{r.sold_today}</td>
              <td
                className={`px-4 py-2.5 text-right font-medium ${
                  r.remaining_estimate <= 0 ? 'text-app-error' : 'text-app-text'
                }`}
              >
                {r.remaining_estimate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 text-xs text-app-text-faint">
        "Remaining (est.)" is available minus sold so far today — it doesn't yet account for waste, which
        is only known once you log end-of-day disposition.
      </p>
    </div>
  )
}
