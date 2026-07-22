export function FlavorBreakdownView({ branchId }: { branchId: string | null }) {
  return (
    <div className="p-4 text-app-text-muted">
      Flavor-level breakdown coming next ({branchId ?? 'all branches'}).
    </div>
  )
}
