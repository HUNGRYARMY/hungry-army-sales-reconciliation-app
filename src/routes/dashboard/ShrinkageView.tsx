export function ShrinkageView({ branchId, date }: { branchId: string | null; date: string }) {
  return (
    <div className="p-4 text-app-text-muted">
      Shrinkage view coming next ({branchId ?? 'all branches'}, {date}).
    </div>
  )
}
