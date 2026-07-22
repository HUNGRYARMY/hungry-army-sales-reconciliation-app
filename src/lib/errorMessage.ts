// Supabase's thrown errors (PostgrestError, StorageError, etc.) aren't reliably `instanceof Error` across
// versions/call paths — `e instanceof Error ? e.message : String(e)` silently degrades to the useless
// "[object Object]" whenever that check is false. Duck-type on `.message` instead, which every error shape
// this app throws actually has.
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return String(e)
}
