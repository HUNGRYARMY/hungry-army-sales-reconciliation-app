import type { Product } from '../../types/domain'

const SIZE_LABEL: Record<string, string> = { regular: 'Regular', junior: 'Junior' }

export function ProductGrid({
  products,
  disabled,
  onTap,
}: {
  products: Product[]
  disabled: boolean
  onTap: (product: Product) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onTap(p)}
          className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-lg border border-app-border bg-app-card px-3 py-4 text-center transition-colors hover:border-app-accent active:bg-app-accent/20 disabled:opacity-50"
        >
          <span className="text-base font-semibold text-app-text">{p.flavor_name}</span>
          <span className="text-xs text-app-text-muted">{SIZE_LABEL[p.size] ?? p.size}</span>
        </button>
      ))}
      {products.length === 0 && (
        <p className="col-span-full py-8 text-center text-app-text-muted">No active products.</p>
      )}
    </div>
  )
}
