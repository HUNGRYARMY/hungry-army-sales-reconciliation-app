import { useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useAllBranches } from '../../lib/queries/branches'
import { getBusinessDate } from '../../lib/businessDate'
import { usePersistedState } from '../../lib/usePersistedState'
import { BranchDateFilter } from './BranchDateFilter'
import { CashVarianceView } from './CashVarianceView'
import { ShrinkageView } from './ShrinkageView'
import { DiscountReviewView } from './DiscountReviewView'
import { SpotAuditView } from './SpotAuditView'
import { FlavorBreakdownView } from './FlavorBreakdownView'
import { AdminHome } from './admin/AdminHome'

type Section = 'cash' | 'shrinkage' | 'discounts' | 'spot-audit' | 'flavors' | 'admin'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'cash', label: 'Cash Variance' },
  { id: 'shrinkage', label: 'Shrinkage' },
  { id: 'discounts', label: 'Discount Review' },
  { id: 'spot-audit', label: 'Spot Audit' },
  { id: 'flavors', label: 'Flavor Breakdown' },
  { id: 'admin', label: 'Admin' },
]

export function DashboardHome() {
  const [section, setSection] = usePersistedState<Section>('dashboard-section', 'cash')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [date, setDate] = useState(() => getBusinessDate())
  const branches = useAllBranches()

  return (
    <AppShell>
      <div className="flex flex-wrap border-b border-app-border bg-app-sidebar px-4">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${
              section === s.id ? 'border-app-accent text-app-text' : 'border-transparent text-app-text-muted'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section !== 'admin' && (
        <BranchDateFilter
          branches={branches.data ?? []}
          branchId={branchId}
          onBranchChange={setBranchId}
          date={date}
          onDateChange={setDate}
        />
      )}

      {section === 'cash' && <CashVarianceView branches={branches.data ?? []} branchId={branchId} date={date} />}
      {section === 'shrinkage' && <ShrinkageView branches={branches.data ?? []} branchId={branchId} date={date} />}
      {section === 'discounts' && <DiscountReviewView branchId={branchId} />}
      {section === 'spot-audit' && <SpotAuditView branchId={branchId} />}
      {section === 'flavors' && <FlavorBreakdownView branchId={branchId} />}
      {section === 'admin' && <AdminHome />}
    </AppShell>
  )
}
