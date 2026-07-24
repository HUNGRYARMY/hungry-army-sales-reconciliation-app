import { usePersistedState } from '../../../lib/usePersistedState'
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
  const [section, setSection] = usePersistedState<AdminSection>('admin-section', 'branches')

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-app-border bg-app-sidebar px-4 py-2.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`shrink-0 whitespace-nowrap rounded-md px-4 py-3 text-sm font-medium ${
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
