import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/auth/AuthContext'
import { homeRouteForRole } from '../guards'
import logo from '../../assets/hungry-army-logo.png'

// Reached only via the link in a password-reset email (redirectTo points here) — Supabase's client
// picks up the recovery token from the URL and establishes a real session before this ever renders,
// so by the time someone lands here they're already "signed in" as far as AuthContext is concerned.
// This route intentionally sits outside RequireRole so that session doesn't just bounce them straight
// to their app before they've had a chance to set a new password.
export function ResetPasswordPage() {
  const { profile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-text">
      <div className="w-full max-w-sm rounded-lg border border-app-border bg-app-card p-6 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src={logo} alt="Hungry Army" className="h-16 w-auto" />
          <p className="text-sm text-app-text-muted">Set a new password</p>
        </div>

        {done ? (
          <>
            <p className="mb-4 text-sm text-app-text">Your password has been updated.</p>
            <a
              href={homeRouteForRole(profile?.role ?? null)}
              className="block w-full rounded-md bg-app-accent py-2.5 text-center font-medium text-white transition-colors hover:bg-app-accent-hover"
            >
              Continue
            </a>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-app-text-muted">New password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
              />
            </label>

            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-app-text-muted">Confirm password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
              />
            </label>

            {error && <p className="mb-4 text-sm text-app-error">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-app-accent py-2.5 font-medium text-white transition-colors hover:bg-app-accent-hover disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Set password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
