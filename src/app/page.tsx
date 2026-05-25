'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import MyFridgeSection from '@/components/MyFridgeSection'
import TodayRecommendedRecipes from '@/components/TodayRecommendedRecipes'
import DetectiveOfficeSection from '@/components/DetectiveOfficeSection'
import BottomNavigation from '@/components/BottomNavigation'
import { useIngredients } from '@/hooks/useIngredients'
import { usePineconeRecommendations } from '@/hooks/usePineconeRecommendations'
import { useAppStore } from '@/store/useAppStore'
import type { RecommendedRecipe } from '@/components/TodayRecommendedRecipes'
import type { ChatRecipe } from '@/types'

// 화면 2: 메인 페이지 — 상단 정보 / 하단 캐릭터 오피스 2단 구성
export default function MainPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: ingredients = [], isLoading: loadingIngredients } = useIngredients()
  const setSelectedRecipe = useAppStore((s) => s.setSelectedRecipe)
  const { data: pineconeRecipes = [], isLoading: loadingRecipes } = usePineconeRecommendations(ingredients)

  const recommendedRecipes: RecommendedRecipe[] = pineconeRecipes.map(
    (r: ChatRecipe, i: number) => ({
      id: String(i),
      name: r.name,
      image: r.imageUrl,
      requiredIngredients: r.ingredientsRaw.split(',').map((s) => s.trim()).filter(Boolean),
      cookingTime: r.cookTimeMinutes,
      servings: 1,
      difficulty: '보통' as const,
      _chatRecipe: r,
    })
  )
  const [ready, setReady] = useState(false)

  // 첫 로그인 감지 — 바로 /tutorial/step1로 이동 (메인 화면 안 거침)
  useEffect(() => {
    if (!session?.user?.email) return
    if (loadingIngredients) return

    const key = `visited_${session.user.email}`
    const hasVisited = localStorage.getItem(key)

    if (!hasVisited && ingredients.length === 0) {
      localStorage.setItem(key, '1')
      router.replace('/tutorial/step1')
      return
    }
    setReady(true)
  }, [session, loadingIngredients, ingredients.length, router])

  if (!ready) return null

  return (
    <MobileContainer fullHeight>
      {/* 헤더 */}
      <header className="px-4 pb-3" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900 flex items-center gap-1.5 leading-none">
          <span className="text-[22px] leading-none">🌱</span>
          <span>냉장고 탐정</span>
        </h1>
      </header>

      {/* 상단 정보 영역 — 스크롤 없음 */}
      <div className="pt-1">
        <MyFridgeSection
          ingredients={ingredients}
          isLoading={loadingIngredients}
          onClickAll={() => router.push('/rescue-list')}
          onClickItem={() => router.push('/rescue-list')}
          onClickAdd={() => router.push('/ai-recognition')}
        />

        <TodayRecommendedRecipes
          fridgeIngredients={ingredients}
          recipes={recommendedRecipes}
          isLoading={loadingRecipes}
          onClickRecipe={(recipe) => {
            const chatRecipe = (recipe as RecommendedRecipe & { _chatRecipe?: ChatRecipe })._chatRecipe
            if (chatRecipe) setSelectedRecipe(chatRecipe)
            router.push('/recipe')
          }}
          onClickViewMore={() => router.push('/chatbot')}
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
