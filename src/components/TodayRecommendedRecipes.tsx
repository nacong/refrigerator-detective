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
  expiringSoonIngredients?: Ingredient[]
  onClickRecipe?: (recipe: RecommendedRecipe) => void
  onClickViewMore?: () => void
}

export const mockRecommendedRecipes: RecommendedRecipe[] = [
  {
    id: 'r1',
    name: '우유 양파 크림파스타',
    emoji: '🍝',
    requiredIngredients: ['우유', '양파', '면', '버터'],
    cookingTime: 15,
    servings: 1,
    difficulty: '쉬움',
  },
  {
    id: 'r2',
    name: '대파 계란볶음밥',
    emoji: '🍳',
    requiredIngredients: ['대파', '계란', '밥', '간장'],
    cookingTime: 30,
    servings: 1,
    difficulty: '쉬움',
  },
  {
    id: 'r3',
    name: '두부 계란국',
    emoji: '🍲',
    requiredIngredients: ['두부', '계란', '대파', '국간장'],
    cookingTime: 20,
    servings: 2,
    difficulty: '쉬움',
  },
  {
    id: 'r4',
    name: '양파 채소볶음',
    emoji: '🥘',
    requiredIngredients: ['양파', '당근', '간장'],
    cookingTime: 10,
    servings: 1,
    difficulty: '쉬움',
  },
]

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
  expiringSoonIngredients,
  onClickRecipe,
  onClickViewMore,
}: TodayRecommendedRecipesProps) {
  const fridge = fridgeIngredients
  const source = recipes && recipes.length > 0 ? recipes : mockRecommendedRecipes

  const expiring = useMemo(() => {
    if (expiringSoonIngredients) return expiringSoonIngredients
    return fridge.filter((i) => daysUntil(i.expiryDate) <= 3)
  }, [fridge, expiringSoonIngredients])

  const ranked = useMemo(() => {
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
  }, [source, fridge, expiring])

  if (ranked.length === 0) return null

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[16px] font-bold text-gray-800">오늘의 추천 레시피</h2>
        <button
          onClick={onClickViewMore}
          className="text-[13px] text-gray-400 font-medium flex items-center gap-0.5"
        >
          더보기 <span aria-hidden>›</span>
        </button>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
        {ranked.map((recipe) => {
          const matched = (recipe as RecommendedRecipe & { _matched?: string[] })._matched ?? []
          return (
            <button
              key={recipe.id}
              onClick={() => onClickRecipe?.(recipe)}
              className="flex-shrink-0 w-[148px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform text-left"
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
