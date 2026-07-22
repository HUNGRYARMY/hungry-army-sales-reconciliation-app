export function DiscountReviewView({ branchId }: { branchId: string | null }) {
  return (
    <div className="p-4 text-app-text-muted">
      Discount review queue coming next ({branchId ?? 'all branches'}).
    </div>
  )
}
