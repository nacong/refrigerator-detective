'use client'

import { useMemo } from 'react'
import type { Ingredient } from '@/types'

/**
 * 오늘의 추천 레시피 — 내 냉장고 재료 기반 추천 섹션.
 */

export interface RecommendedRecipe {
  id: string
  name: string
  image?: string
  emoji?: string
  requiredIngredients: string[]
  cookingTime: number
  servings: number
  difficulty: '쉬움' | '보통' | '어려움'
}

interface TodayRecommendedRecipesProps {
  fridgeIngredients?: Ingredient[]
  recipes?: RecommendedRecipe[]
  isLoading?: boolean
  expiringSoonIngredients?: Ingredient[]
  onClickRecipe?: (recipe: RecommendedRecipe) => void
  onClickViewMore?: () => void
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default function TodayRecommendedRecipes({
  fridgeIngredients = [],
  recipes,
  isLoading = false,
  expiringSoonIngredients,
  onClickRecipe,
}: TodayRecommendedRecipesProps) {
  const fridge = fridgeIngredients

  const expiring = useMemo(() => {
    if (expiringSoonIngredients) return expiringSoonIngredients
    return fridge.filter((i) => daysUntil(i.expiryDate) <= 3)
  }, [fridge, expiringSoonIngredients])

  const ranked = useMemo(() => {
    const source = recipes ?? []
    const ingNames = new Set(fridge.map((i) => i.name))
    const expNames = new Set(expiring.map((i) => i.name))

    const annotated = source.map((r) => {
      const matched = r.requiredIngredients.filter((n) => ingNames.has(n))
      const expCount = r.requiredIngredients.filter((n) => expNames.has(n)).length
      return { ...r, _matched: matched, _exp: expCount }
    })

    const anyMatch = annotated.some((r) => r._matched.length > 0)
    const filtered = anyMatch
      ? annotated.filter((r) => r._matched.length > 0)
      : annotated

    return filtered
      .sort((a, b) => {
        if (b._exp !== a._exp) return b._exp - a._exp
        return b._matched.length - a._matched.length
      })
      .slice(0, 6)
  }, [recipes, fridge, expiring])

  return (
    <section className="mb-5 pt-3">
      <div className="grid grid-cols-2 gap-3 px-4">
        {isLoading && [1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square rounded-2xl bg-gray-200 animate-pulse" />
        ))}
        {!isLoading && ranked.length === 0 && [1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square rounded-2xl bg-gray-100 flex items-center justify-center">
            <span className="text-[36px] opacity-20">🍳</span>
          </div>
        ))}
        {ranked.map((recipe) => {
          const matched = (recipe as RecommendedRecipe & { _matched?: string[] })._matched ?? []
          return (
            <button
              key={recipe.id}
              onClick={() => onClickRecipe?.(recipe)}
              className="aspect-square rounded-2xl overflow-hidden relative active:scale-[0.97] transition-transform w-full"
            >
              {/* 풀 이미지 */}
              {recipe.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.image} alt={recipe.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#F9F5FF] to-[#ECFDF5] flex items-center justify-center">
                  <span className="text-[56px] leading-none" aria-hidden>{recipe.emoji ?? '🍳'}</span>
                </div>
              )}

              {/* 하단 그라데이션 + 제목 */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3 pb-3 pt-10">
                <p className="text-white text-[17px] font-bold line-clamp-2 leading-snug">
                  {recipe.name}
                </p>
                {matched.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {matched.slice(0, 3).map((name) => (
                      <span
                        key={name}
                        className="text-[10px] font-medium text-white/90 bg-white/20 rounded-full px-2 py-0.5"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
