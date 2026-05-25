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
      .slice(0, 3)
  }, [recipes, fridge, expiring])

  return (
    <section className="mb-5">
      <div className="px-4 mb-3">
        <h2 className="text-[16px] font-bold text-gray-800">오늘의 추천 레시피</h2>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
        {!isLoading && ranked.length === 0 && (
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-[148px] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                <div className="w-full h-[100px] bg-gray-100 flex items-center justify-center">
                  <span className="text-[32px] opacity-30">🍳</span>
                </div>
                <div className="px-2.5 pt-2 pb-2.5 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-[148px] rounded-2xl overflow-hidden bg-gray-100 animate-pulse">
            <div className="w-full h-[100px] bg-gray-200" />
            <div className="px-2.5 pt-2 pb-2.5 space-y-2">
              <div className="h-3 bg-gray-200 rounded-full w-3/4" />
              <div className="h-2.5 bg-gray-200 rounded-full w-1/2" />
            </div>
          </div>
        ))}
        {ranked.map((recipe) => {
          const matched = (recipe as RecommendedRecipe & { _matched?: string[] })._matched ?? []
          return (
            <button
              key={recipe.id}
              onClick={() => onClickRecipe?.(recipe)}
              className="flex-shrink-0 w-[148px] bg-white border border-gray-200 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform text-left"
            >
              {/* 썸네일 */}
              <div className="relative w-full h-[100px] bg-gradient-to-br from-[#F9F5FF] to-[#ECFDF5] flex items-center justify-center">
                {recipe.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[44px] leading-none" aria-hidden>
                    {recipe.emoji ?? '🍳'}
                  </span>
                )}

                {matched.length > 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-bold text-[#0E8F5B] border border-[#BBF7D0]">
                    재료 {matched.length}개 일치
                  </span>
                )}
              </div>

              {/* 정보 */}
              <div className="px-2.5 pt-2 pb-2.5">
                <p className="text-[13px] font-bold text-gray-800 truncate">
                  {recipe.name}
                </p>
                <div className="mt-1 flex items-center gap-1 flex-wrap">
                  <span className="inline-flex items-center text-[10.5px] font-medium text-gray-500 bg-gray-100 rounded-full px-[7px] py-[2px] leading-[1.3] whitespace-nowrap">
                    {recipe.cookingTime}분
                  </span>
                  <span className="inline-flex items-center text-[10.5px] font-medium text-gray-500 bg-gray-100 rounded-full px-[7px] py-[2px] leading-[1.3] whitespace-nowrap">
                    {recipe.servings}인분
                  </span>
                  <span className="inline-flex items-center text-[10.5px] font-medium text-gray-500 bg-gray-100 rounded-full px-[7px] py-[2px] leading-[1.3] whitespace-nowrap">
                    {recipe.difficulty}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
