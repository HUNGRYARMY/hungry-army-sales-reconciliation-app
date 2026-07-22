import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

type ConnectionStatus =
  | { state: 'checking' }
  | { state: 'unconfigured' }
  | { state: 'ok'; branchCount: number }
  | { state: 'error'; message: string }

function App() {
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'checking' })

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setStatus({ state: 'unconfigured' })
      return
    }

    supabase
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) {
          setStatus({ state: 'error', message: error.message })
        } else {
          setStatus({ state: 'ok', branchCount: count ?? 0 })
        }
      })
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 text-slate-800">
      <h1 className="text-2xl font-semibold">Hungry Army — Sales &amp; Cash Reconciliation</h1>
      <p className="text-slate-600">Phase A scaffold: data model + auth. Branch tally, dashboard, and reporting UI land in later phases.</p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        {status.state === 'checking' && <p>Checking Supabase connection…</p>}
        {status.state === 'unconfigured' && (
          <p>
            Not configured yet. Copy <code>.env.example</code> to <code>.env.local</code> and fill in your Supabase
            project URL and anon key.
          </p>
        )}
        {status.state === 'ok' && <p>Connected — {status.branchCount} branch(es) found.</p>}
        {status.state === 'error' && <p className="text-red-600">Connection error: {status.message}</p>}
      </div>
    </main>
  )
}

export default App
