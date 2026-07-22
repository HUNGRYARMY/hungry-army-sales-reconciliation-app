import { useActiveProducts, useTodayDispositionStatus, useInvalidateTodayDispositionStatus } from './hooks'
import { DispositionRow } from './DispositionRow'

export function DispositionForm({ branchId, enteredBy }: { branchId: string; enteredBy: string }) {
  const products = useActiveProducts()
  const status = useTodayDispositionStatus(branchId)
  const invalidate = useInvalidateTodayDispositionStatus()

  return (
    <div className="rounded-lg border border-app-border bg-app-sidebar">
      <h2 className="border-b border-app-border px-4 py-3 text-sm font-semibold text-app-text">
        End-of-day disposition (waste &amp; carry-forward)
      </h2>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {(products.data ?? []).map((p) => (
          <DispositionRow
            key={p.id}
            product={p}
            branchId={branchId}
            enteredBy={enteredBy}
            alreadyLogged={status.data?.has(p.id) ?? false}
            onSubmitted={invalidate}
          />
        ))}
      </div>
    </div>
  )
}
