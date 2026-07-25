import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import logo from '../../assets/hungry-army-logo.png'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'signIn' | 'forgotPassword'>('signIn')
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) setError(error.message)
  }

  async function handleResetRequest(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSubmitting(false)
    // Always show the same confirmation regardless of whether the email matched an account —
    // mirrors Supabase's own enumeration-safe behavior on this endpoint.
    setResetSent(true)
  }

  if (mode === 'forgotPassword') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-text">
        <div className="w-full max-w-sm rounded-lg border border-app-border bg-app-card p-6 shadow-lg">
          <div className="mb-6 flex flex-col items-center gap-2">
            <img src={logo} alt="Hungry Army" className="h-16 w-auto" />
            <p className="text-sm text-app-text-muted">Reset your password</p>
          </div>

          {resetSent ? (
            <>
              <p className="mb-4 text-sm text-app-text">
                If <span className="text-app-text">{email}</span> has an account, a reset link is on its way.
                Check your inbox (and spam folder).
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('signIn')
                  setResetSent(false)
                }}
                className="w-full rounded-md border border-app-border py-2.5 font-medium text-app-text-muted transition-colors hover:text-app-text"
              >
                Back to sign in
              </button>
            </>
          ) : (
            <form onSubmit={handleResetRequest}>
              <label className="mb-4 block text-sm">
                <span className="mb-1 block text-app-text-muted">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
                />
              </label>

              {error && <p className="mb-4 text-sm text-app-error">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mb-2 w-full rounded-md bg-app-accent py-2.5 font-medium text-white transition-colors hover:bg-app-accent-hover disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => setMode('signIn')}
                className="w-full rounded-md py-2 text-sm text-app-text-muted transition-colors hover:text-app-text"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-text">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-app-border bg-app-card p-6 shadow-lg"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src={logo} alt="Hungry Army" className="h-16 w-auto" />
          <p className="text-sm text-app-text-muted">Sales &amp; Cash Reconciliation</p>
        </div>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-app-text-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>

        <label className="mb-2 block text-sm">
          <span className="mb-1 block text-app-text-muted">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-app-border bg-app-bg px-3 py-2.5 text-app-text outline-none focus:border-app-accent"
          />
        </label>

        <div className="mb-4 text-right">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setMode('forgotPassword')
            }}
            className="text-sm text-app-text-muted transition-colors hover:text-app-accent"
          >
            Forgot password?
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-app-error">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-app-accent py-2.5 font-medium text-white transition-colors hover:bg-app-accent-hover disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
