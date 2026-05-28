'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Ingredient } from '@/types'

// 식재료 목록 조회
export function useIngredients() {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const res = await fetch('/api/supabase/ingredients')
      if (!res.ok) throw new Error('식재료 불러오기 실패')
      return res.json()
    },
  })
}

// 식재료 추가
export function useAddIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ingredient: Pick<Ingredient, 'name' | 'emoji' | 'quantity' | 'expiryDate' | 'location' | 'category'>) => {
      const res = await fetch('/api/supabase/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingredient),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `식재료 추가 실패 (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

// 식재료 삭제
export function useDeleteIngredient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/supabase/ingredients?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('식재료 삭제 실패')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}
