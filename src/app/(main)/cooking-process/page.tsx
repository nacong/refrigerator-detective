'use client'

import { forwardRef, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useAppStore } from '@/store/useAppStore'
import { useQueryClient } from '@tanstack/react-query'

export default function CookingProcessPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const recipe = useAppStore((s) => s.selectedRecipe)

  const ingredientList = (recipe?.ingredientsRaw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const cookingSteps = recipe?.steps ?? []
  const totalSteps = 1 + cookingSteps.length

  const [currentIndex, setCurrentIndex] = useState(1)
  const [completedTimes, setCompletedTimes] = useState<Record<number, string>>({})
  const [isDone, setIsDone] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(Date.now())

  const currentPhase = isDone ? 2 : currentIndex === 0 ? 0 : 1

  const now = () =>
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  const handleNext = () => {
    const time = now()
    setCompletedTimes((prev) => ({ ...prev, [currentIndex]: time }))
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      handleComplete(time)
    }
  }

  const handleComplete = async (finalTime?: string) => {
    setIsSaving(true)
    const completionTime = finalTime ?? now()
    setCompletedTimes((prev) => ({ ...prev, [totalSteps - 1]: completionTime }))
    setIsDone(true)
    const actualCookTime = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000))
    try {
      await fetch('/api/supabase/cooking-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: recipe?.name ?? '',
          cookTime: actualCookTime,
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['cooking-history'] })
    } catch {
      // 저장 실패해도 UI 유지
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentIndex])

  if (!recipe) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-400">레시피를 찾을 수 없어요.</p>
          <button onClick={() => router.back()} className="text-sm text-[#13AF70] font-medium">
            돌아가기
          </button>
        </div>
      </MobileContainer>
    )
  }

  const detectiveImages = [
    '/images/detective_camera.png',
    '/images/detective_check.png',
    '/images/detective_finding.png',
    '/images/detective_frontview.png',
    '/images/detective_idea.png',
    '/images/detective_ingredient.png',
    '/images/detective_kitchen.png',
    '/images/detective_recipe.png',
    '/images/detective_report.png',
    '/images/detective_salute.png',
    '/images/detective_surprise.png',
    '/images/detective_thinking.png',
    '/images/detective_warning.png',
  ]
  const heroImage = isDone
    ? '/images/detective_happy.png'
    : detectiveImages[currentIndex % detectiveImages.length]

  return (
    <MobileContainer fullHeight>

      {/* 헤더 */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: 'max(52px, calc(env(safe-area-inset-top) + 16px))' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 flex-shrink-0"
            aria-label="뒤로가기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-[17px] font-bold text-gray-900 truncate max-w-[180px]">{recipe.name}</p>
        </div>
        {recipe.cookTimeMinutes > 0 && (
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
            소요시간 {recipe.cookTimeMinutes}분
          </span>
        )}
      </div>

      {/* 진행 단계 표시 */}
      <div className="mx-4 mt-4 flex items-center">
        <StepDot label="재료준비" status={currentPhase > 0 ? 'done' : currentPhase === 0 ? 'current' : 'pending'} />
        <StepLine active={currentPhase >= 1} />
        <StepDot label="조리" status={currentPhase > 1 ? 'done' : currentPhase === 1 ? 'current' : 'pending'} />
        <StepLine active={currentPhase >= 2} />
        <StepDot label="완성" status={currentPhase === 2 ? 'done' : 'pending'} />
      </div>

      {/* 스텝 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-28 space-y-2">

        {/* 조리 스텝들 */}
        {cookingSteps.map((step, i) => {
          const stepIndex = i + 1
          const status = completedTimes[stepIndex]
            ? 'done'
            : currentIndex === stepIndex
            ? 'current'
            : 'pending'
          return (
            <StepCard
              key={i}
              ref={currentIndex === stepIndex ? scrollRef : undefined}
              stepIndex={stepIndex}
              label={step}
              status={status}
              completedAt={completedTimes[stepIndex]}
              heroImage={heroImage}
            />
          )
        })}

        {/* 완성 */}
        {isDone && (
          <div className="flex items-center gap-3 bg-[#F0FBF5] rounded-2xl px-4 py-3">
            <div className="w-6 h-6 rounded-full bg-[#13AF70] flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-bold text-[#0D9E63] flex-1">요리 완성!</p>
            <span className="text-xs text-gray-400">{completedTimes[totalSteps - 1]}</span>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-white border-t border-gray-100">
        {!isDone ? (
          <button
            onClick={handleNext}
            className="w-full bg-[#13AF70] text-white font-bold py-4 rounded-2xl text-[16px] active:scale-[0.98] transition-transform"
          >
            {currentIndex === totalSteps - 1 ? '요리 완성!' : '다음 단계'}
          </button>
        ) : (
          <button
            onClick={() => router.back()}
            disabled={isSaving}
            className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl text-[16px] active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '돌아가기'}
          </button>
        )}
      </div>

    </MobileContainer>
  )
}

// 진행 점
function StepDot({ label, status }: { label: string; status: 'done' | 'current' | 'pending' }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
        status === 'done' ? 'bg-[#13AF70]' :
        status === 'current' ? 'bg-[#13AF70] ring-4 ring-[#13AF70]/20' :
        'bg-gray-200'
      }`}>
        {status === 'done' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={`text-[10px] font-medium ${status === 'pending' ? 'text-gray-300' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  )
}

// 연결선
function StepLine({ active }: { active: boolean }) {
  return (
    <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-colors ${active ? 'bg-[#13AF70]' : 'bg-gray-200'}`} />
  )
}

// 스텝 카드
const StepCard = forwardRef<
  HTMLDivElement,
  {
    stepIndex: number
    label: string
    status: 'done' | 'current' | 'pending'
    completedAt?: string
    heroImage?: string
    children?: React.ReactNode
  }
>(({ stepIndex, label, status, completedAt, heroImage, children }, ref) => {
  if (status === 'current') {
    return (
      <div ref={ref} className="bg-[#F0FBF5] rounded-3xl px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-bold text-[#0D9E63] leading-snug">{label}</p>
          {children}
        </div>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" className="h-[72px] object-contain flex-shrink-0 transition-all duration-500" />
        )}
      </div>
    )
  }
  if (status === 'done') {
    return (
      <div ref={ref} className="flex items-start gap-3 px-1 py-2">
        <div className="w-5 h-5 rounded-full bg-[#13AF70]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-[#13AF70]">{stepIndex}</span>
        </div>
        <p className="text-sm text-gray-400 flex-1 leading-snug line-through">{label}</p>
        {completedAt && <span className="text-xs text-gray-300 flex-shrink-0 mt-0.5">{completedAt}</span>}
      </div>
    )
  }
  return (
    <div ref={ref} className="flex items-start gap-3 px-1 py-2">
      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-gray-400">{stepIndex}</span>
      </div>
      <p className="text-sm text-gray-300 leading-snug">{label}</p>
    </div>
  )
})
StepCard.displayName = 'StepCard'
