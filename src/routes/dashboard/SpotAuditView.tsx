export function SpotAuditView({ branchId }: { branchId: string | null }) {
  return (
    <div className="p-4 text-app-text-muted">
      Spot audit log coming next ({branchId ?? 'all branches'}).
    </div>
  )
}
