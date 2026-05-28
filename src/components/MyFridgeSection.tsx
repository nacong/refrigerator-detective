'use client'

import { useMemo } from 'react'
import IngredientChip from '@/components/ui/IngredientChip'
import type { Ingredient } from '@/types'

/**
 * 내 냉장고 — 메인 페이지 상단의 가로 스크롤 식재료 카드 리스트.
 */

interface MyFridgeSectionProps {
  ingredients?: Ingredient[]
  isLoading?: boolean
  onClickAll?: () => void
  onClickItem?: (ingredient: Ingredient) => void
  onClickAdd?: () => void
}

export default function MyFridgeSection({
  ingredients = [],
  isLoading = false,
  onClickAll,
  onClickItem,
  onClickAdd,
}: MyFridgeSectionProps) {
  const sorted = useMemo(
    () =>
      [...ingredients].sort(
        (a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
      ),
    [ingredients],
  )

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[16px] font-bold text-gray-800">나의 식재료</h2>
        <button
          onClick={onClickAll}
          className="text-[13px] text-gray-400 font-medium flex items-center gap-0.5"
        >
          전체 보기 <span aria-hidden>›</span>
        </button>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
        {isLoading ? (
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[90px] h-[90px] bg-gray-100 rounded-2xl animate-pulse flex-shrink-0"
              />
            ))}
          </div>
        ) : (
          <>
            {sorted.slice(0, 8).map((ingredient) => (
              <IngredientChip
                key={ingredient.id}
                ingredient={ingredient}
                onClick={() => onClickItem?.(ingredient)}
              />
            ))}

            {/* + 추가 카드 */}
            <button
              onClick={onClickAdd}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1 bg-white border border-dashed border-gray-200 rounded-2xl p-3 w-[90px] active:scale-95 transition-transform"
              aria-label="식재료 추가"
            >
              <span className="text-2xl text-gray-300 leading-none">+</span>
              <span className="text-xs font-medium text-gray-400">추가</span>
            </button>
          </>
        )}
      </div>
    </section>
  )
}
