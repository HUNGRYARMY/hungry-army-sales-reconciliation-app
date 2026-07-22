import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) setError(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 text-app-text">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-app-border bg-app-card p-6 shadow-lg"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-accent text-lg font-bold text-white">
            HA
          </div>
          <h1 className="text-lg font-semibold">Hungry Army</h1>
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

        <label className="mb-4 block text-sm">
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
