'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
import ExpiryBadge from '@/components/ui/ExpiryBadge'
import { useIngredients, useDeleteIngredient } from '@/hooks/useIngredients'
import type { Ingredient } from '@/types'

// 화면 4: 나의 식재료 상세 페이지
export default function RescueListPage() {
  const router = useRouter()
  const { data: ingredients = [], isLoading } = useIngredients()
  const deleteIngredient = useDeleteIngredient()

  // 유통기한 순 정렬
  const sortedIngredients = [...ingredients].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  )

  const handleDelete = (id: string) => {
    deleteIngredient.mutate(id)
  }

  return (
    <MobileContainer fullHeight>
      {/* 헤더 */}
      <header className="px-4 pb-3 border-b border-gray-100" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900">나의 식재료</h1>
      </header>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 no-scrollbar">
        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[110px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (

        /* 3열 그리드 */
        <div className="grid grid-cols-3 gap-2">
          {sortedIngredients.map((ingredient) => (
            <IngredientCard
              key={ingredient.id}
              ingredient={ingredient}
              onDelete={() => handleDelete(ingredient.id)}
            />
          ))}

          {/* 식재료 추가 카드 */}
          <button
            onClick={() => router.push('/ai-recognition?from=rescue-list')}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl active:bg-gray-50 transition-colors"
            style={{ minHeight: 100 }}
          >
            <span className="text-xl text-gray-300 font-light">+</span>
            <span className="text-xs text-gray-400 font-medium">식재료 추가</span>
          </button>
        </div>
        )}
      </div>

      <BottomNavigation active="fridge" />
    </MobileContainer>
  )
}

// 식재료 카드 컴포넌트
function IngredientCard({
  ingredient,
  onDelete,
}: {
  ingredient: Ingredient
  onDelete: () => void
}) {
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl px-2 pt-2 pb-2.5 flex flex-col items-center gap-1.5" style={{ minHeight: 100 }}>
      {/* 상단: D-day 뱃지(좌) + 삭제(우) */}
      <div className="w-full flex items-center justify-between">
        <ExpiryBadge expiryDate={ingredient.expiryDate} size="sm" />
        <button
          onClick={onDelete}
          className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-[9px] active:bg-red-100 active:text-red-400"
          aria-label={`${ingredient.name} 삭제`}
        >
          ✕
        </button>
      </div>

      {/* 이모지 */}
      <span className="text-[32px] leading-none">{ingredient.emoji}</span>

      {/* 재료명 + 수량 */}
      <div className="flex items-baseline justify-center gap-1 w-full">
        <p className="text-[12px] font-bold text-gray-900 truncate">{ingredient.name}</p>
        {ingredient.quantity && (
          <span className="text-[12px] font-bold text-gray-900 flex-shrink-0">{ingredient.quantity}</span>
        )}
      </div>
    </div>
  )
}
