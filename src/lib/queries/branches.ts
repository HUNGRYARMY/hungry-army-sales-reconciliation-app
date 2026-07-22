import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import type { Branch } from '../../types/domain'

export function useAllBranches() {
  return useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name')
      if (error) throw error
      return data as unknown as Branch[]
    },
  })
}
