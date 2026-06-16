'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
import type { ChatRecipe, Ingredient } from '@/types'
import IngredientChip from '@/components/ui/IngredientChip'
import { useDeleteIngredient } from '@/hooks/useIngredients'
import { useQueryClient } from '@tanstack/react-query'

function attachParticle(text: string): string {
  const last = text[text.length - 1]
  const code = last?.charCodeAt(0) ?? 0
  if (code < 0xAC00 || code > 0xD7A3) return text + '가'
  return (code - 0xAC00) % 28 !== 0 ? text + '이' : text + '가'
}

function formatIngredientCta(names: string[]): { label: string; message: string } {
  const displayText =
    names.length <= 3
      ? names.join(', ')
      : `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}개`
  const label = `${attachParticle(displayText)} 포함된 레시피 만들기`
  const message = ``
  return { label, message }
}

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function ExpiringIngredients({
  ingredients,
  selectedIds,
  onCardClick,
}: {
  ingredients: Ingredient[]
  selectedIds: Set<string>
  onCardClick: (ing: Ingredient) => void
}) {
  const expiring = ingredients
    .map((i) => ({ ...i, daysLeft: getDaysUntilExpiry(i.expiryDate) }))
    .filter((i) => i.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  if (expiring.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/detective_happy.png" alt="탐정" className="w-32 h-32 object-contain" />
        <p className="text-base font-bold text-gray-800">유통기한 임박 재료가 없어요</p>
        <p className="text-sm text-gray-400 text-center">냉장고 재료가 모두 신선해요 👍</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex flex-wrap gap-2">
        {expiring.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl transition-all ${selectedIds.has(item.id) ? 'ring-2 ring-[#13AF70]' : ''}`}
          >
            <IngredientChip ingredient={item} onClick={() => onCardClick(item)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// 화면 2: 메인 페이지 — 상단 정보 / 하단 캐릭터 오피스 2단 구성
export default function MainPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: ingredients = [], isLoading: loadingIngredients } = useIngredients()
  const setSelectedRecipe = useAppStore((s) => s.setSelectedRecipe)
  const setPendingChat = useAppStore((s) => s.setPendingChat)
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
  const [floatExpanded, setFloatExpanded] = useState(false)
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeTab, setActiveTab] = useState<0 | 1>(0)
  const [showSoloModal, setShowSoloModal] = useState(false)
  const [soloSearch, setSoloSearch] = useState('')

  // 오늘 확인해야 해요 탭 — 재료 선택 / 폐기
  const queryClient = useQueryClient()
  const deleteIngredient = useDeleteIngredient()
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set())
  const [discardTarget, setDiscardTarget] = useState<Ingredient | null>(null)

  const handleIngredientCardClick = useCallback((ing: Ingredient) => {
    const daysLeft = getDaysUntilExpiry(ing.expiryDate)
    if (daysLeft < 0) {
      setDiscardTarget(ing)
    } else {
      setSelectedIngredientIds((prev) => {
        const next = new Set(prev)
        if (next.has(ing.id)) next.delete(ing.id); else next.add(ing.id)
        return next
      })
    }
  }, [])

  const handleDiscardConfirm = useCallback(() => {
    if (!discardTarget) return
    deleteIngredient.mutate(discardTarget.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ingredients'] })
        setSelectedIngredientIds((prev) => { const next = new Set(prev); next.delete(discardTarget.id); return next })
      },
    })
    setDiscardTarget(null)
  }, [discardTarget, deleteIngredient, queryClient])

  const selectedIngredients = ingredients.filter((i) => selectedIngredientIds.has(i.id))

  const handleDismissDetective = useCallback(() => {
    setDismissingDetective(true)
    setFloatExpanded(true)
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current)
    expandTimerRef.current = setTimeout(() => setFloatExpanded(false), 2600)
    setTimeout(() => {
      setShowDetective(false)
      setDismissingDetective(false)
    }, 450)
  }, [])

  // 유통기한 3일 이내 재료 수
  const expiringCount = ingredients.filter((i) => {
    const d = getDaysUntilExpiry(i.expiryDate)
    return d <= 3
  }).length

  // 로딩 완료 후 임박 재료 없으면 탭 1 자동 전환 (최초 1회)
  const didAutoSwitch = useRef(false)
  useEffect(() => {
    if (loadingIngredients || didAutoSwitch.current || ingredients.length === 0) return
    didAutoSwitch.current = true
    if (expiringCount === 0) setActiveTab(1)
  }, [loadingIngredients, expiringCount, ingredients.length])

  // 첫 로그인 감지 — 바로 /tutorial/step1로 이동 (메인 화면 안 거침)
  useEffect(() => () => {
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current)
  }, [])

  useEffect(() => {
    if (!session?.user?.email) return
    if (loadingIngredients) return

    const key = `visited_${session.user.email}`
    const hasVisited = localStorage.getItem(key)

    if (!hasVisited && ingredients.length === 0) {
      localStorage.setItem(key, '1')
      router.replace('/tutorial')
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
        <div className="flex items-center gap-2">
          {/* 튜토리얼 버튼 */}
          <button
            onClick={() => router.push('/tutorial')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="튜토리얼"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span className="text-[13px] font-medium text-gray-700">튜토리얼</span>
          </button>
          {/* YouTube 탐색 버튼 */}
          <button
            onClick={() => setShowSoloModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="자취 유튜버 레시피 탐색"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="3" fill="#FF0000" />
              <path d="M10 9l6 3-6 3V9z" fill="white" />
            </svg>
            <span className="text-[13px] font-medium text-gray-700">탐색</span>
          </button>
        </div>
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
          {(['오늘 확인해야 해요', '지금 재료로 만들 수 있어요'] as const).map((label, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i as 0 | 1)}
              className={`flex-1 py-3 text-[14px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === i ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {label}
              {i === 0 && expiringCount > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  activeTab === 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {expiringCount}
                </span>
              )}
            </button>
          ))}
          <div
            className="absolute bottom-0 h-[2px] bg-gray-900 transition-all duration-200"
            style={{ width: '50%', left: `${activeTab * 50}%` }}
          />
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 0 && (
          <ExpiringIngredients
            ingredients={ingredients}
            selectedIds={selectedIngredientIds}
            onCardClick={handleIngredientCardClick}
          />
        )}
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

      {/* 선택 재료 레시피 검색 CTA */}
      {selectedIngredients.length > 0 && (() => {
        const names = selectedIngredients.map((i) => i.name)
        const { label, message } = formatIngredientCta(names)
        return (
          <div
            className="absolute left-0 right-0 z-30 px-4 pointer-events-none"
            style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              className="w-full min-h-[56px] pointer-events-auto flex items-center justify-center bg-[#13AF70] rounded-2xl text-white active:scale-[0.98] transition-transform px-4"
              style={{ boxShadow: '0 8px 20px rgba(19,175,112,.32)' }}
              onClick={() => {
                setPendingChat(names, message)
                router.push('/chatbot')
              }}
            >
              <span className="text-[14px] font-bold text-center leading-tight">{label}</span>
            </button>
          </div>
        )
      })()}

      {/* 플로팅 냉탐이 — CTA 없을 때만 표시 */}
      {selectedIngredients.length === 0 && <button
        type="button"
        aria-label="냉탐이와 레시피 찾기"
        onClick={() => router.push('/chatbot')}
        className="absolute z-[38] inline-flex items-center cursor-pointer"
        style={{
          right: 14,
          bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
          gap: floatExpanded ? 10 : 0,
          height: 62,
          paddingLeft: 0,
          paddingRight: floatExpanded ? 16 : 0,
          borderRadius: 9999,
          overflow: 'hidden',
          background: '#EAF7EF',
          border: '2px solid #BFE8CF',
          boxShadow: '0 8px 20px -6px rgba(19,175,112,.45), 0 0 0 4px rgba(19,175,112,.07)',
          fontFamily: 'inherit',
          transition: 'gap .34s ease, padding-right .34s ease',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/detective_salute.png"
          alt="냉탐이"
          draggable={false}
          style={{
            flexShrink: 0,
            width: 58, height: 58,
            objectFit: 'cover', objectPosition: '50% 8%',
            transform: 'scale(1.42)', transformOrigin: '50% 6%',
          }}
        />
        <span style={{
          display: 'flex', alignItems: 'center', lineHeight: 1.15, whiteSpace: 'nowrap',
          maxWidth: floatExpanded ? 200 : 0,
          opacity: floatExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-width .38s ease, opacity .26s ease',
        }}>
          <span style={{ fontSize: 15.5, fontWeight: 800, color: '#1F2937' }}>오늘 뭐 먹을까요?</span>
        </span>
      </button>}

      {/* 하단 고정 네비 */}
      <BottomNavigation active="home" />

      {/* 폐기 확인 모달 */}
      {discardTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-7"
          style={{ background: 'rgba(17,24,39,.45)' }}
          onClick={() => setDiscardTarget(null)}
        >
          <div
            className="relative w-full bg-white flex flex-col items-center gap-3"
            style={{ maxWidth: 320, borderRadius: 22, padding: '20px 22px 22px', boxShadow: '0 20px 40px rgba(17,24,39,.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDiscardTarget(null)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 text-base active:bg-gray-100"
            >✕</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/detective_warning.png" alt="냉탐이의 경고" draggable={false} className="w-[132px] h-[132px] object-contain mt-2" />
            <p className="m-0 text-[14px] font-semibold leading-relaxed text-gray-800 text-center break-keep">
              해당 재료는 소비기한이 만료되었습니다.<br />폐기해주세요!
            </p>
            <p className="m-0 text-[11.5px] text-gray-400 text-center">
              {discardTarget.emoji} {discardTarget.name} · D+{Math.abs(getDaysUntilExpiry(discardTarget.expiryDate))}
            </p>
            <button
              onClick={handleDiscardConfirm}
              className="w-full mt-1.5 h-12 text-white text-[14px] font-bold rounded-[14px] active:opacity-90 transition-opacity"
              style={{ background: '#7B5CD6', boxShadow: '0 4px 12px rgba(123,92,214,.32)' }}
            >
              폐기완료
            </button>
          </div>
        </div>
      )}

      {/* 솔로쿠킹 탐색 모달 */}
      {showSoloModal && (
        <div className="fixed inset-0 z-50 bg-white flex justify-center">
          <div
            className="w-full max-w-[430px] flex flex-col relative"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
          >
          {/* 검색 헤더 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => { setShowSoloModal(false); setSoloSearch('') }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 flex-shrink-0"
              aria-label="돌아가기"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={soloSearch}
                onChange={(e) => setSoloSearch(e.target.value)}
                placeholder="레시피, 채널명 검색"
                className="flex-1 bg-transparent text-[14px] text-gray-800 placeholder-gray-400 outline-none"
                autoFocus
              />
              {soloSearch && (
                <button onClick={() => setSoloSearch('')} className="flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#D1D5DB" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* 솔로쿠킹 콘텐츠 (스크롤) */}
          <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            <SoloCookingSection searchQuery={soloSearch} />
          </div>
          {/* 플로팅 냉탐이 */}
          <button
            type="button"
            aria-label="냉탐이와 레시피 찾기"
            onClick={() => { setShowSoloModal(false); setSoloSearch(''); router.push('/chatbot') }}
            className="absolute z-[52] inline-flex items-center cursor-pointer"
            style={{
              right: 14,
              bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
              height: 62,
              padding: 0,
              borderRadius: 9999,
              overflow: 'hidden',
              background: '#EAF7EF',
              border: '2px solid #BFE8CF',
              boxShadow: '0 8px 20px -6px rgba(19,175,112,.45), 0 0 0 4px rgba(19,175,112,.07)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/detective_salute.png"
              alt="냉탐이"
              draggable={false}
              style={{
                width: 58, height: 58,
                objectFit: 'cover', objectPosition: '50% 8%',
                transform: 'scale(1.42)', transformOrigin: '50% 6%',
              }}
            />
          </button>
          </div>
        </div>
      )}

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
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                <h2 className="text-[16px] font-bold text-gray-900">개발자 레터</h2>
              </div>
              <button onClick={closeLetter} className="text-gray-400 text-sm active:text-gray-600">닫기</button>
            </div>
            <div className="flex flex-col gap-5 text-[14px] text-gray-700 leading-relaxed">
              <p>안녕하세요 😊<br />냉장고 탐정을 사용해주셔서 감사합니다.</p>
              <div className="bg-[#F0FBF5] rounded-2xl px-4 py-4 flex flex-col gap-2">
                <p className="font-bold text-[#0D9E63] text-[15px]">오전의 뇌는 다릅니다.</p>
                <p className="text-gray-600">
                  심리학자 Roy Baumeister의 <span className="font-semibold">결정 피로(Decision Fatigue)</span> 연구에 따르면,
                  우리가 하루 동안 내리는 크고 작은 결정들이 쌓일수록 뇌의 판단력은 서서히 소모됩니다.
                </p>
              </div>
              <p>저녁 7시의 나는 요리하고 싶지 않습니다.<br />그 판단을 <span className="font-semibold text-gray-900">오전의 나에게 맡겨보세요.</span></p>
              <div className="border-l-4 border-[#13AF70] pl-4 flex flex-col gap-1.5">
                <p className="font-semibold text-gray-900">오전·점심에 요리 → 저녁에 같은 걸 먹기</p>
                <p className="text-gray-500 text-[13px]">이 사이클은 먹는 것 자체를 루틴으로 만들어줍니다.</p>
              </div>
              <p className="text-right text-gray-400 text-[13px]">— 개발팀 드림</p>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
