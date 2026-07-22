import type { Bundle } from '../../types/domain'

export function BundleGrid({
  bundles,
  disabled,
  onTap,
}: {
  bundles: Bundle[]
  disabled: boolean
  onTap: (bundle: Bundle) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
      {bundles.map((b) => (
        <button
          key={b.id}
          type="button"
          disabled={disabled}
          onClick={() => onTap(b)}
          className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-lg border border-app-border bg-app-card px-3 py-4 text-center transition-colors hover:border-app-accent active:bg-app-accent/20 disabled:opacity-50"
        >
          <span className="text-base font-semibold text-app-text">{b.name}</span>
          <span className="text-xs text-app-text-muted">₱{Number(b.price).toFixed(2)}</span>
        </button>
      ))}
      {bundles.length === 0 && (
        <p className="col-span-full py-8 text-center text-app-text-muted">No active bundles.</p>
      )}
    </div>
  )
}
