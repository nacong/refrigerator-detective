'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import IngredientChip from '@/components/ui/IngredientChip'
import RecipeCard from '@/components/ui/RecipeCard'
import { useIngredients } from '@/hooks/useIngredients'
import { useRecipes } from '@/hooks/useRecipes'

// 화면 2: 메인 페이지
export default function MainPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: ingredients = [], isLoading: loadingIngredients } = useIngredients()
  const { data: recipes = [], isLoading: loadingRecipes } = useRecipes()

  // 첫 로그인 감지 — 식재료가 없으면 AI 인식으로 이동
  useEffect(() => {
    if (!session?.user?.email) return
    if (loadingIngredients) return

    const key = `visited_${session.user.email}`
    const hasVisited = localStorage.getItem(key)

    if (!hasVisited && ingredients.length === 0) {
      localStorage.setItem(key, '1')
      router.push('/tutorial/step1')
    }
  }, [session, loadingIngredients, ingredients.length, router])

  // 유통기한 임박 순으로 정렬
  const rescueList = [...ingredients].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  )

  return (
    <MobileContainer fullHeight>
      <div className="safe-top" />

      {/* 헤더 */}
      <header className="px-4 pt-2 pb-3 flex items-center justify-end">
        <button
          onClick={() => router.push('/settings')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="설정"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      <div className="overflow-y-auto no-scrollbar pb-2">
        {/* 섹션 1: 구조대 목록 */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-gray-800">구조대 목록</h2>
            <button
              onClick={() => router.push('/rescue-list')}
              className="text-sm text-[#13AF70] font-medium"
            >
              더보기 →
            </button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
            {loadingIngredients ? (
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-[90px] h-[90px] bg-gray-100 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : rescueList.length === 0 ? (
              <button
                onClick={() => router.push('/ai-recognition/step1')}
                className="flex items-center gap-2 py-4 text-sm text-[#13AF70] font-medium"
              >
                <span>📸</span>
                <span>AI로 식재료 등록하기</span>
              </button>
            ) : (
              rescueList.slice(0, 8).map((ingredient) => (
                <IngredientChip
                  key={ingredient.id}
                  ingredient={ingredient}
                  onClick={() => router.push('/rescue-list')}
                />
              ))
            )}
          </div>
        </section>

        {/* 섹션 2: 요리 기록 */}
        <section className="mb-2">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-gray-800">요리 기록</h2>
            <button
              onClick={() => router.push('/cooking-history')}
              className="text-sm text-[#13AF70] font-medium"
            >
              더보기 →
            </button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
            {loadingRecipes ? (
              <div className="flex gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="w-[140px] h-[150px] bg-gray-100 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : recipes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">아직 요리 기록이 없어요</p>
            ) : (
              recipes.slice(0, 6).map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => router.push('/cooking-history')}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* 캐릭터 영역 — 항상 하단 고정 */}
      <div className="flex-1 flex flex-col items-center justify-end pb-4 safe-bottom">
        <button
          onClick={() => router.push('/chatbot')}
          className="flex flex-col items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="relative bg-[#E8F9F1] border border-[#13AF70] rounded-2xl px-5 py-4 max-w-[260px]">
            <p className="text-sm text-gray-700 text-center font-medium">
              저를 눌러보세요<br/>맛있는 레시피를 찾아드릴게요!
            </p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#E8F9F1] border-b border-r border-[#13AF70] rotate-45" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/character.jpg"
            alt="냉탐이"
            className="w-56 h-56 rounded-full object-cover"
          />
        </button>
      </div>
    </MobileContainer>
  )
}
