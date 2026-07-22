import { useAuth } from '../../lib/auth/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  branch_staff: 'Branch Staff',
  commissary_staff: 'Commissary',
  founder_admin: 'Founder Admin',
  supervisor: 'Supervisor',
}

export function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-app-border bg-app-sidebar px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Logo placeholder — swap for the real Hungry Army mark whenever it's provided */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-accent text-sm font-bold text-white">
          HA
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-app-text">Hungry Army</div>
          <div className="text-xs text-app-text-muted">Sales &amp; Cash Reconciliation</div>
        </div>
      </div>

      {profile && (
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right leading-tight">
            <div className="text-app-text">{profile.full_name || 'Unnamed'}</div>
            <div className="text-xs text-app-text-muted">
              {profile.role ? ROLE_LABELS[profile.role] : 'Unassigned'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-md border border-app-border px-3 py-1.5 text-app-text-muted transition-colors hover:border-app-accent hover:text-app-text"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
