import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
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
  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace />
  if (!profile?.role) return <Navigate to="/unassigned" replace />
  if (!allow.includes(profile.role)) return <Navigate to={homeRouteForRole(profile.role)} replace />
  return children
}

// Signing in doesn't itself navigate anywhere — it just flips auth state. Without this, a successful
// sign-in leaves the user sitting on /login since nothing else re-routes them away from it.
export function LoginRoute() {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (session) return <Navigate to={homeRouteForRole(profile?.role ?? null)} replace />
  return <LoginPage />
}
