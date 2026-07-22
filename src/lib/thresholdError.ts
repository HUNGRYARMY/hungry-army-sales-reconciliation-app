// The close_out_ledger/stamp_cash_entry triggers (see supabase/migrations/0007) raise a Postgres exception
// containing this phrase when a shrinkage/cash-variance threshold is breached and no explanation was
// supplied. Supabase surfaces raised exception messages verbatim in PostgrestError.message.
export function isExplanationRequiredError(message: string | undefined | null): boolean {
  return !!message && message.toLowerCase().includes('explanation required')
}
