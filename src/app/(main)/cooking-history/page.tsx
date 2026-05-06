'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import RecipeCard from '@/components/ui/RecipeCard'
import { useRecipes } from '@/hooks/useRecipes'

// 화면 5: 요리 기록 상세 페이지
export default function CookingHistoryPage() {
  const router = useRouter()
  const { data: recipes = [], isLoading } = useRecipes()

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
        <h1 className="text-base font-bold text-gray-800">요리 기록</h1>
      </header>

      {/* 레시피 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[100px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">🍳</span>
            <p className="text-sm text-gray-400">아직 요리 기록이 없어요</p>
            <button
              onClick={() => router.push('/chatbot')}
              className="text-sm text-[#13AF70] font-medium"
            >
              냉탐이에게 레시피 추천받기 →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                variant="vertical"
              />
            ))}
          </div>
        )}
      </div>

      <div className="safe-bottom" />
    </MobileContainer>
  )
}
