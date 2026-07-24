import { useAuth } from '../../lib/auth/AuthContext'
import logo from '../../assets/hungry-army-logo.png'

const ROLE_LABELS: Record<string, string> = {
  branch_staff: 'Branch Staff',
  commissary_staff: 'Commissary',
  founder_admin: 'Founder Admin',
  supervisor: 'Supervisor',
}

export function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between gap-2 border-b border-app-border bg-app-sidebar px-3 py-2.5 print:hidden sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center gap-3">
        <img src={logo} alt="Hungry Army" className="h-8 w-auto shrink-0" />
        <div className="hidden text-xs text-app-text-muted sm:block">Sales &amp; Cash Reconciliation</div>
      </div>

      {profile && (
        <div className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
          <div className="max-w-[110px] truncate text-right leading-tight sm:max-w-none">
            <div className="truncate text-app-text">{profile.full_name || 'Unnamed'}</div>
            <div className="text-xs text-app-text-muted">
              {profile.role ? ROLE_LABELS[profile.role] : 'Unassigned'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="shrink-0 rounded-md border border-app-border px-3 py-1.5 text-app-text-muted transition-colors hover:border-app-accent hover:text-app-text"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
