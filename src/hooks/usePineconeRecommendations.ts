'use client'

import { useQuery } from '@tanstack/react-query'
import type { ChatRecipe, Ingredient } from '@/types'

export function usePineconeRecommendations(ingredients: Ingredient[]) {
  const query = ingredients.map((i) => i.name).join(', ')

  return useQuery<ChatRecipe[]>({
    queryKey: ['pinecone-recommendations', query],
    queryFn: async () => {
      const params = new URLSearchParams({ ingredients: query })
      const res = await fetch(`/api/pinecone/recommend?${params}`)
      if (!res.ok) throw new Error('추천 레시피 불러오기 실패')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
    enabled: ingredients.length > 0,
  })
}
