import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import type { Branch } from '../../../types/domain'

export function useAllBranchesAdmin() {
  return useQuery({
    queryKey: ['admin-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name')
      if (error) throw error
      return data as unknown as Branch[]
    },
  })
}

export async function insertBranch(input: { name: string; closing_time: string | null }) {
  const { error } = await supabase.from('branches').insert(input)
  if (error) throw error
}

export async function updateBranch(id: string, patch: Partial<{ name: string; closing_time: string | null; is_active: boolean }>) {
  const { error } = await supabase.from('branches').update(patch).eq('id', id)
  if (error) throw error
}

export function useInvalidateAdmin() {
  const qc = useQueryClient()
  return (key: string) => qc.invalidateQueries({ queryKey: [key] })
}
