'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import MyFridgeSection from '@/components/MyFridgeSection'
import TodayRecommendedRecipes from '@/components/TodayRecommendedRecipes'
import DetectiveOfficeSection from '@/components/DetectiveOfficeSection'
import BottomNavigation from '@/components/BottomNavigation'
import { useIngredients } from '@/hooks/useIngredients'

// 화면 2: 메인 페이지 — 상단 정보 / 하단 캐릭터 오피스 2단 구성
export default function MainPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: ingredients = [], isLoading: loadingIngredients } = useIngredients()

  // 첫 로그인 감지 — 식재료가 없으면 튜토리얼로 이동
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

  return (
    <MobileContainer fullHeight>
      <div className="safe-top" />

      {/* 헤더 */}
      <header className="px-4 pt-2 pb-3 flex items-center justify-between">
        <span className="w-9 h-9" aria-hidden />
        <h1 className="text-[17px] font-bold text-gray-800 flex items-center gap-1 whitespace-nowrap">
          냉장고 탐정 <span aria-hidden className="text-[#7B5CD6]">✨</span>
        </h1>
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

      {/* 상단 정보 영역 — 스크롤 없음 */}
      <div className="pt-1">
        <MyFridgeSection
          ingredients={ingredients}
          isLoading={loadingIngredients}
          onClickAll={() => router.push('/rescue-list')}
          onClickItem={() => router.push('/rescue-list')}
          onClickAdd={() => router.push('/ai-recognition/step1')}
        />

        <TodayRecommendedRecipes
          fridgeIngredients={ingredients}
          onClickRecipe={() => router.push('/recipe')}
          onClickViewMore={() => router.push('/recipe')}
        />
      </div>

      {/* 하단 캐릭터 영역 — 남은 공간 채우며 하단 고정 */}
      <div className="flex-1 min-h-0">
        <DetectiveOfficeSection
          onClick={() => router.push('/chatbot')}
        />
      </div>

      {/* 하단 고정 네비 */}
      <BottomNavigation active="home" />
    </MobileContainer>
  )
}
