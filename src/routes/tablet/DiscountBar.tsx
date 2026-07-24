import type { DiscountType, Promo } from '../../types/domain'

const OPTIONS: { value: DiscountType; label: string }[] = [
  { value: 'none', label: 'Regular' },
  { value: 'senior', label: 'Senior' },
  { value: 'pwd', label: 'PWD' },
  { value: 'promo', label: 'Promo' },
  { value: 'other', label: 'Other' },
]

interface Props {
  value: DiscountType
  onChange: (v: DiscountType) => void
  promos: Promo[]
  selectedPromoId: string | null
  onSelectPromo: (id: string) => void
}

export function DiscountBar({ value, onChange, promos, selectedPromoId, onSelectPromo }: Props) {
  return (
    <div className="border-b border-app-border bg-app-sidebar px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md border px-5 py-3.5 text-base font-medium transition-colors ${
              value === opt.value
                ? 'border-app-accent bg-app-accent text-white'
                : 'border-app-border bg-app-card text-app-text-muted hover:border-app-accent hover:text-app-text'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value === 'promo' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {promos.length === 0 && <span className="text-sm text-app-text-faint">No active promos configured.</span>}
          {promos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPromo(p.id)}
              className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                selectedPromoId === p.id
                  ? 'border-app-accent bg-app-accent/20 text-app-text'
                  : 'border-app-border text-app-text-muted hover:border-app-accent'
              }`}
            >
              {p.name} ({Math.round(p.rate * 100)}%)
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
