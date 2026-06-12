'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import TodayRecommendedRecipes from '@/components/TodayRecommendedRecipes'
import DetectiveSummaryHero from '@/components/DetectiveSummaryHero'
import SoloCookingSection from '@/components/SoloCookingSection'
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
  const [showLetter, setShowLetter] = useState(false)
  const closeLetter = useCallback(() => setShowLetter(false), [])

  const [showDetective, setShowDetective] = useState(true)
  const [dismissingDetective, setDismissingDetective] = useState(false)
  const [activeTab, setActiveTab] = useState<0 | 1>(0)
  const handleDismissDetective = useCallback(() => {
    setDismissingDetective(true)
    setTimeout(() => {
      setShowDetective(false)
      setDismissingDetective(false)
    }, 450)
  }, [])


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
      {/* 헤더 — 고정 */}
      <header className="px-4 pb-3 flex items-center justify-between flex-shrink-0 bg-white" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900 flex items-center gap-1.5 leading-none">
          <span className="text-[22px] leading-none">🌱</span>
          <span>냉장고 탐정</span>
        </h1>
        {/* 개발자 레터 버튼 — 임시 비활성화 */}
        {false && (
          <button
            onClick={() => setShowLetter(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="개발자 레터"
          >
            <span className="text-[13px]">✉️</span>
            <span className="text-[12px] font-medium text-gray-500">개발자 레터</span>
          </button>
        )}
      </header>

      {/* 전체 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

        {/* 탐정 배너 */}
        {showDetective && (
          <div
            style={{
              overflow: 'hidden',
              maxHeight: dismissingDetective ? '0px' : '600px',
              opacity: dismissingDetective ? 0 : 1,
              transform: dismissingDetective ? 'translateY(-12px)' : 'translateY(0)',
              transition: dismissingDetective
                ? 'transform 0.25s ease, opacity 0.2s ease, max-height 0.45s ease 0.15s'
                : 'none',
            }}
          >
            <DetectiveSummaryHero
              ingredients={ingredients}
              suggestedRecipeName={recommendedRecipes[0]?.name}
              onClickFindRecipeWithDetective={() => router.push('/chatbot')}
              onDismiss={handleDismissDetective}
            />
          </div>
        )}

        {/* 탭 헤더 */}
        <div className="flex relative px-4 bg-white sticky top-0 z-10" style={{ boxShadow: '0 1px 0 0 #f3f4f6', transform: 'translateZ(0)' }}>
          {(['자취 유튜버 인기 레시피', '지금 재료로 만들 수 있어요'] as const).map((label, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i as 0 | 1)}
              className={`flex-1 py-3 text-[14px] font-semibold transition-colors ${
                activeTab === i ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
          <div
            className="absolute bottom-0 h-[2px] bg-gray-900 transition-all duration-200"
            style={{ width: '50%', left: `${activeTab * 50}%` }}
          />
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 0 && <SoloCookingSection />}
        {activeTab === 1 && (
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
        )}
      </div>

      {/* 하단 고정 네비 */}
      <BottomNavigation active="home" />

      {/* 개발자 레터 모달 — 임시 비활성화 */}
      {false && showLetter && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={closeLetter}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-5 pb-10 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 + 헤더 */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                <h2 className="text-[16px] font-bold text-gray-900">개발자 레터</h2>
              </div>
              <button onClick={closeLetter} className="text-gray-400 text-sm active:text-gray-600">닫기</button>
            </div>

            {/* 본문 */}
            <div className="flex flex-col gap-5 text-[14px] text-gray-700 leading-relaxed">

              <p>안녕하세요 😊<br />냉장고 탐정을 사용해주셔서 감사합니다.</p>

              <div className="bg-[#F0FBF5] rounded-2xl px-4 py-4 flex flex-col gap-2">
                <p className="font-bold text-[#0D9E63] text-[15px]">오전의 뇌는 다릅니다.</p>
                <p className="text-gray-600">
                  심리학자 Roy Baumeister의 <span className="font-semibold">결정 피로(Decision Fatigue)</span> 연구에 따르면,
                  우리가 하루 동안 내리는 크고 작은 결정들이 쌓일수록 뇌의 판단력은 서서히 소모됩니다.
                  그래서 오전에는 하기 싫은 일도 비교적 수월하게 해낼 수 있어요.
                </p>
              </div>

              <p>
                저녁 7시의 나는 요리하고 싶지 않습니다.<br />
                그 판단을 <span className="font-semibold text-gray-900">오전의 나에게 맡겨보세요.</span>
              </p>

              <div className="border-l-4 border-[#13AF70] pl-4 flex flex-col gap-1.5">
                <p className="font-semibold text-gray-900">오전·점심에 요리 → 저녁에 같은 걸 먹기</p>
                <p className="text-gray-500 text-[13px]">
                  이 사이클은 단순히 식비를 아끼는 것을 넘어, 먹는 것 자체를 루틴으로 만들어줍니다.
                  결정해야 할 것이 하나 줄어드는 것만으로 저녁이 훨씬 가벼워져요.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl px-4 py-4">
                <p className="font-bold text-gray-900 mb-1.5">⏱ 습관은 평균 66일</p>
                <p className="text-gray-600 text-[13px]">
                  UCL의 Phillippa Lally 연구팀에 따르면, 새로운 행동이 자동화되기까지는 평균 <span className="font-semibold">66일</span>이 걸립니다.
                  두 달이 지나면 &lsquo;오늘 뭐 먹지?&rsquo;라는 고민 자체가 사라집니다.
                </p>
              </div>

              <p>
                냉장고 탐정은 그 66일 동안 옆에서 함께할게요. 🕵️<br />
                오늘 냉장고에 있는 재료로 딱 하나만 만들어보는 것부터 시작해요.
              </p>

              <p className="text-right text-gray-400 text-[13px]">— 개발팀 드림</p>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
