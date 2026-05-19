import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface CookingHistoryItem {
  id: string
  user_email: string
  recipe_id: string | null
  cooked_at: string
  cook_time: number
  // recipes 조인 데이터
  recipe_name: string
  thumbnail_url: string
  cost_per_serving: number
  ingredients: string[]
  steps: string[]
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
