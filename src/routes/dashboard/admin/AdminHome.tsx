import { useState } from 'react'
import { BranchesAdmin } from './BranchesAdmin'
import { ProductsAdmin } from './ProductsAdmin'
import { PromosAdmin } from './PromosAdmin'
import { BundlesAdmin } from './BundlesAdmin'
import { RatesThresholdsAdmin } from './RatesThresholdsAdmin'

type AdminSection = 'branches' | 'products' | 'promos' | 'bundles' | 'rates'

const SECTIONS: { id: AdminSection; label: string }[] = [
  { id: 'branches', label: 'Branches' },
  { id: 'products', label: 'Products & Prices' },
  { id: 'promos', label: 'Promos' },
  { id: 'bundles', label: 'Bundles' },
  { id: 'rates', label: 'Rates & Thresholds' },
]

export function AdminHome() {
  const [section, setSection] = useState<AdminSection>('branches')

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-app-border bg-app-sidebar px-4 py-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              section === s.id ? 'bg-app-accent text-white' : 'text-app-text-muted hover:text-app-text'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {section === 'branches' && <BranchesAdmin />}
        {section === 'products' && <ProductsAdmin />}
        {section === 'promos' && <PromosAdmin />}
        {section === 'bundles' && <BundlesAdmin />}
        {section === 'rates' && <RatesThresholdsAdmin />}
      </div>
    </div>
  )
}
