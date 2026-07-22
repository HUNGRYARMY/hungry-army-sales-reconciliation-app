import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import type { Branch } from '../../types/domain'

export function useAllBranches() {
  return useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*')
      if (error) throw error
      const branches = data as unknown as Branch[]
      // Manual order set in Admin > Branches wins everywhere branches are listed (dropdowns, filters, etc.)
      return branches.sort((a, b) => {
        const oa = a.sort_order ?? Number.MAX_SAFE_INTEGER
        const ob = b.sort_order ?? Number.MAX_SAFE_INTEGER
        if (oa !== ob) return oa - ob
        return a.name.localeCompare(b.name)
      })
    },
  })
}
