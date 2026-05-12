'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
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
    <MobileContainer>
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 safe-top pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-gray-800">나의 식재료</h1>
      </header>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 no-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">냉장고 식재료 목록</p>
        </div>

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
            onClick={() => router.push('/ai-recognition/step2?from=rescue-list')}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl active:bg-gray-50 transition-colors"
            style={{ minHeight: 110 }}
          >
            <span className="text-xl text-gray-300 font-light">+</span>
            <span className="text-xs text-gray-400 font-medium">식재료 추가</span>
          </button>
        </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 safe-bottom">
        <button
          onClick={() => router.push('/ai-recognition/step2?from=rescue-list')}
          className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>📸</span>
          <span>AI로 식재료 인식하기</span>
        </button>
      </div>
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
    <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden" style={{ minHeight: 110 }}>
      {/* D-day 뱃지 — 좌상단 */}
      <div className="absolute top-2 left-2">
        <ExpiryBadge expiryDate={ingredient.expiryDate} size="sm" />
      </div>

      {/* 삭제 버튼 — 우상단 */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-[10px] active:bg-red-100 active:text-red-400"
        aria-label={`${ingredient.name} 삭제`}
      >
        ✕
      </button>

      {/* 이모지 */}
      <div className="flex justify-center mt-8 mb-1">
        <span className="text-[36px] leading-none">{ingredient.emoji}</span>
      </div>

      {/* 이름 + 수량 한 줄 */}
      <div className="flex items-baseline justify-center gap-1 px-2 pb-3">
        <span className="text-[12px] font-semibold text-gray-700 truncate">{ingredient.name}</span>
        {ingredient.quantity && (
          <span className="text-[11px] text-gray-400 flex-shrink-0">{ingredient.quantity}</span>
        )}
      </div>
    </div>
  )
}
