import type { RecentTallyRow } from './hooks'

const DISCOUNT_LABEL: Record<string, string> = {
  none: 'Regular',
  senior: 'Senior',
  pwd: 'PWD',
  promo: 'Promo',
  other: 'Other',
}

export function RecentActivity({ rows }: { rows: RecentTallyRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-app-text-muted">No sales logged yet today.</p>
  }

  return (
    <ul className="divide-y divide-app-border">
      {rows.map((r) => (
        <li
          key={`${r.kind}-${r.id}`}
          className={`flex items-center justify-between px-4 py-2.5 text-sm ${r.isVoid ? 'opacity-40 line-through' : ''}`}
        >
          <span className="text-app-text">
            {r.label}
            {r.kind === 'sale' && r.discountType && r.discountType !== 'none' && (
              <span className="ml-2 rounded bg-app-accent/20 px-1.5 py-0.5 text-xs text-app-accent">
                {DISCOUNT_LABEL[r.discountType] ?? r.discountType}
              </span>
            )}
          </span>
          <span className="text-app-text-muted">+{r.qty}</span>
        </li>
      ))}
    </ul>
  )
}
