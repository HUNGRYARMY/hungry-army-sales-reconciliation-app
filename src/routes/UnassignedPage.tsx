import { AppShell } from '../components/layout/AppShell'

export function UnassignedPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-lg font-semibold text-app-text">Waiting for setup</h1>
        <p className="text-sm text-app-text-muted">
          Your account isn't assigned to a role or branch yet. Ask a founder/admin to assign you in the
          founder dashboard, then sign out and back in.
        </p>
      </div>
    </AppShell>
  )
}
