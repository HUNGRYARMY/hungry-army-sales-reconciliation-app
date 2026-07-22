import { AppShell } from '../components/layout/AppShell'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-lg font-semibold text-app-text">{title}</h1>
        <p className="text-sm text-app-text-muted">This part of the app lands in a later phase.</p>
      </div>
    </AppShell>
  )
}
