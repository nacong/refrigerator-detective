'use client'

import { useQuery } from '@tanstack/react-query'
import type { Recipe } from '@/types'

// 요리 기록 조회
export function useRecipes() {
  return useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await fetch('/api/supabase/recipes')
      if (!res.ok) throw new Error('요리 기록 불러오기 실패')
      return res.json()
    },
  })
}
