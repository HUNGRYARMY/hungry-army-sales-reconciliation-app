import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
  )
}

// Not parameterized with the generated Database type yet (see src/types/database.types.ts) — that placeholder
// makes every table resolve to `never`, which breaks .insert()/.select() typing worse than having no generic
// at all. Once `supabase gen types` can run (needs local Docker), re-add createClient<Database>(...) here.
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
