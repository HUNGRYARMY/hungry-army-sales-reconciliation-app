import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { LoginPage } from './auth/LoginPage'
import type { UserRole } from '../types/domain'

export function FullScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg text-app-text-muted">Loading…</div>
  )
}

export function homeRouteForRole(role: UserRole | null): string {
  switch (role) {
    case 'branch_staff':
      return '/tablet'
    case 'commissary_staff':
      return '/commissary'
    case 'founder_admin':
    case 'supervisor':
      return '/dashboard'
    default:
      return '/unassigned'
  }
}

export function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={homeRouteForRole(profile?.role ?? null)} replace />
}

export function RequireRole({ allow, children }: { allow: UserRole[]; children: ReactElement }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoading />
  // Bookmarking a specific app (e.g. /commissary) and opening it signed-out previously always bounced back
  // to the role's default home after signing in, ignoring what was actually bookmarked — carry the
  // originally-requested path through login via router state so a founder's /commissary bookmark, for
  // example, actually lands on Commissary instead of always landing on the Dashboard.
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile?.role) return <Navigate to="/unassigned" replace />
  if (!allow.includes(profile.role)) return <Navigate to={homeRouteForRole(profile.role)} replace />
  return children
}

// Signing in doesn't itself navigate anywhere — it just flips auth state. Without this, a successful
// sign-in leaves the user sitting on /login since nothing else re-routes them away from it. Prefers
// redirecting back to wherever RequireRole originally bounced the user from (see above) over always going
// to the role's default home — RequireRole re-validates that destination anyway, so an unauthorized/stale
// "from" just bounces again rather than granting access it shouldn't.
export function LoginRoute() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  if (loading) return <FullScreenLoading />
  if (session) return <Navigate to={from || homeRouteForRole(profile?.role ?? null)} replace />
  return <LoginPage />
}
