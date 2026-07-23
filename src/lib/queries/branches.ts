import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import type { Branch } from '../../types/domain'

// Manual order set in Admin > Branches wins everywhere branches are listed (dropdowns, filters, report
// rows, etc.) — shared so every branch fetch in the app sorts identically, not just the ones going
// through useAllBranches().
export function sortBranches<T extends { name: string; sort_order: number | null }>(branches: T[]): T[] {
  return [...branches].sort((a, b) => {
    const oa = a.sort_order ?? Number.MAX_SAFE_INTEGER
    const ob = b.sort_order ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return a.name.localeCompare(b.name)
  })
}

export function useAllBranches() {
  return useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*')
      if (error) throw error
      return sortBranches(data as unknown as Branch[])
    },
  })
}
