import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface CookingHistoryItem {
  id: string
  user_email: string
  recipe_name: string
  cook_time: number
  thumbnail_url: string
  cost_per_serving: number
  ingredients: string[]
  cooked_at: string
  created_at: string
}

export function useCookingHistory() {
  return useQuery<CookingHistoryItem[]>({
    queryKey: ['cooking-history'],
    queryFn: async () => {
      const res = await fetch('/api/supabase/cooking-history')
      if (!res.ok) throw new Error('요리 기록 불러오기 실패')
      return res.json()
    },
  })
}

export function useInvalidateCookingHistory() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['cooking-history'] })
}
