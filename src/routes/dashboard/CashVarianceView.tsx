export function CashVarianceView({ branchId, date }: { branchId: string | null; date: string }) {
  return (
    <div className="p-4 text-app-text-muted">
      Cash variance view coming next ({branchId ?? 'all branches'}, {date}).
    </div>
  )
}
