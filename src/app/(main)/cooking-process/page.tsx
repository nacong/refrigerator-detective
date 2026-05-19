'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useAppStore } from '@/store/useAppStore'
import { useQueryClient } from '@tanstack/react-query'

// 페이즈 인덱스
// 0 = 재료 준비하기 (단일 스텝)
// 1 ~ cookingSteps.length = 요리하기 개별 스텝
// done = 완료

export default function CookingProcessPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const recipe = useAppStore((s) => s.selectedRecipe)

  const ingredientList = (recipe?.ingredientsRaw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const cookingSteps = recipe?.steps ?? []
  const totalSteps = 1 + cookingSteps.length // 0: 재료준비, 1~N: 요리순서

  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedTimes, setCompletedTimes] = useState<Record<number, string>>({})
  const [isDone, setIsDone] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 현재 페이즈 (0=재료준비, 1=조리중, 2=완성)
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

    try {
      await fetch('/api/supabase/cooking-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: recipe?.name ?? '',
          cookTime: recipe?.cookTimeMinutes ?? 0,
          imageUrl: recipe?.imageUrl ?? '',
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['cooking-history'] })
    } catch {
      // 저장 실패해도 UI는 완료 상태 유지
    } finally {
      setIsSaving(false)
    }
  }

  // 새 스텝으로 이동할 때 스크롤
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIndex])

  if (!recipe) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl">🍳</span>
          <p className="text-sm text-gray-400">레시피를 찾을 수 없어요.</p>
          <button onClick={() => router.back()} className="text-sm text-[#13AF70] font-medium">
            ← 돌아가기
          </button>
        </div>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer fullHeight>
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 safe-top pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-sm font-bold text-gray-800 truncate">{recipe.name}</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* 레시피 사진 */}
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-48 object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-5xl flex-shrink-0">🍳</div>
        )}

        {/* 타이머 박스 */}
        <div className="px-4 py-5 text-center border-b border-gray-100">
          <p className="text-6xl font-bold text-gray-900 leading-none">
            {recipe.cookTimeMinutes > 0 ? recipe.cookTimeMinutes : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-2">예상 소요시간 (분)</p>
        </div>

        {/* 페이즈 진행 바 */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center">
            {/* 재료준비 */}
            <PhaseNode label="재료준비" status={currentPhase > 0 ? 'done' : currentPhase === 0 ? 'current' : 'pending'} />
            <PhaseLine active={currentPhase >= 1} />
            {/* 조리 */}
            <PhaseNode label="조리" status={currentPhase > 1 ? 'done' : currentPhase === 1 ? 'current' : 'pending'} />
            <PhaseLine active={currentPhase >= 2} />
            {/* 요리완성 */}
            <PhaseNode label="요리완성" status={currentPhase === 2 ? 'done' : 'pending'} />
          </div>
        </div>

        {/* 타임라인 */}
        <div className="px-4 py-4 pb-6">

          {/* 재료 준비하기 */}
          <TimelineStep
            ref={currentIndex === 0 ? scrollRef : undefined}
            label="재료 준비하기"
            status={completedTimes[0] ? 'done' : currentIndex === 0 ? 'current' : 'pending'}
            completedAt={completedTimes[0]}
            isLast={cookingSteps.length === 0}
          >
            {/* 재료 목록 — 표시 전용 */}
            <ul className="mt-2 space-y-1 pl-1">
              {ingredientList.map((ing, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                  {ing}
                </li>
              ))}
            </ul>
          </TimelineStep>

          {/* 요리하기 단계들 */}
          {cookingSteps.map((step, i) => {
            const stepIndex = i + 1
            const status = completedTimes[stepIndex]
              ? 'done'
              : currentIndex === stepIndex
              ? 'current'
              : 'pending'
            return (
              <TimelineStep
                key={i}
                ref={currentIndex === stepIndex ? scrollRef : undefined}
                label={`${i + 1}. ${step}`}
                status={status}
                completedAt={completedTimes[stepIndex]}
                isLast={i === cookingSteps.length - 1}
              />
            )
          })}

          {/* 요리 완성 */}
          {isDone && (
            <div className="flex items-center gap-3 mt-1">
              <div className="w-7 h-7 rounded-full bg-[#13AF70] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🎉</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#13AF70]">요리 완성!</p>
              </div>
              <span className="text-xs text-gray-400">{completedTimes[totalSteps - 1]}</span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex-shrink-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 safe-bottom">
        {!isDone ? (
          <button
            onClick={handleNext}
            className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {currentIndex === totalSteps - 1 ? (
              <>
                <span>🎉</span>
                <span>요리 완성!</span>
              </>
            ) : (
              <>
                <span>다음 단계</span>
                <span>→</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => router.back()}
            disabled={isSaving}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '← 돌아가기'}
          </button>
        )}
      </div>
    </MobileContainer>
  )
}

// 페이즈 노드
function PhaseNode({ label, status }: { label: string; status: 'done' | 'current' | 'pending' }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          status === 'done'
            ? 'bg-[#13AF70]'
            : status === 'current'
            ? 'border-2 border-[#13AF70] bg-white'
            : 'bg-gray-200'
        }`}
      >
        {status === 'done' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {status === 'current' && <div className="w-2 h-2 rounded-full bg-[#13AF70]" />}
      </div>
      <span className={`text-[10px] font-medium ${status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </span>
    </div>
  )
}

// 페이즈 연결선
function PhaseLine({ active }: { active: boolean }) {
  return (
    <div className={`flex-1 h-0.5 mx-1 mb-4 ${active ? 'bg-[#13AF70]' : 'bg-gray-200'}`} />
  )
}

// 타임라인 스텝
import { forwardRef } from 'react'

const TimelineStep = forwardRef<
  HTMLDivElement,
  {
    label: string
    status: 'done' | 'current' | 'pending'
    completedAt?: string
    isLast?: boolean
    children?: React.ReactNode
  }
>(({ label, status, completedAt, isLast, children }, ref) => {
  return (
    <div ref={ref} className="flex gap-3">
      {/* 아이콘 + 세로선 */}
      <div className="flex flex-col items-center">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            status === 'done'
              ? 'bg-[#13AF70]'
              : status === 'current'
              ? 'border-2 border-[#13AF70] bg-white'
              : 'bg-gray-200'
          }`}
        >
          {status === 'done' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {status === 'current' && <div className="w-2 h-2 rounded-full bg-[#13AF70]" />}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
      </div>

      {/* 내용 */}
      <div className={`flex-1 pb-5 ${isLast ? '' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-medium leading-snug ${
              status === 'pending' ? 'text-gray-400' : 'text-gray-800'
            }`}
          >
            {label}
          </p>
          {completedAt && (
            <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{completedAt}</span>
          )}
        </div>
        {children}
      </div>
    </div>
  )
})
TimelineStep.displayName = 'TimelineStep'
