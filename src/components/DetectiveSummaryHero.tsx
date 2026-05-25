'use client'

import { useMemo } from 'react'
import type { Ingredient } from '@/types'

/* ------------------------------------------------------------------
 * DetectiveSummaryHero
 * 화면 2(메인) 최상단의 "탐정의 오늘 보고" 히어로 섹션.
 * ------------------------------------------------------------------ */

export type DetectiveMood =
  | 'report'
  | 'surprise'
  | 'frontview'
  | 'recipe'
  | 'ingredient'
  | 'warning'
  | 'thinking'

const MOOD_IMAGE: Record<DetectiveMood, string> = {
  report:     '/images/detective_report.png',
  surprise:   '/images/detective_surprise.png',
  frontview:  '/images/detective_frontview.png',
  recipe:     '/images/detective_recipe.png',
  ingredient: '/images/detective_ingredient.png',
  warning:    '/images/detective_warning.png',
  thinking:   '/images/detective_thinking.png',
}

export interface DetectiveSummaryHeroProps {
  ingredients?: Ingredient[]
  monthlySavedAmount?: number
  expiringSoonIngredients?: Ingredient[]
  onClickAddIngredient?: () => void
  onClickFindRecipeWithDetective?: () => void
  forceMood?: DetectiveMood
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

export default function DetectiveSummaryHero({
  ingredients = [],
  monthlySavedAmount,
  expiringSoonIngredients,
  onClickAddIngredient,
  onClickFindRecipeWithDetective,
  forceMood,
}: DetectiveSummaryHeroProps) {
  const expiringList = useMemo(() => {
    if (expiringSoonIngredients) return expiringSoonIngredients
    return ingredients
      .filter((i) => i.expiryDate)
      .map((i) => ({ ingredient: i, d: daysUntil(i.expiryDate) }))
      .filter((x) => x.d <= 3)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.ingredient)
  }, [ingredients, expiringSoonIngredients])

  const isEmpty = ingredients.length < 2
  const hasExpiring = expiringList.length > 0

  const mood: DetectiveMood = useMemo(() => {
    if (forceMood) return forceMood
    if (isEmpty) return 'frontview'
    if (hasExpiring) return 'surprise'
    return 'report'
  }, [forceMood, isEmpty, hasExpiring])

  const savedAmount = useMemo(() => {
    if (typeof monthlySavedAmount === 'number') return monthlySavedAmount
    return 25800
  }, [monthlySavedAmount])

  const title = useMemo(() => {
    if (mood === 'frontview') return '아직 등록된 재료가 적어요'
    if (mood === 'surprise') return '앗! 곧 소비기한이 끝나는 재료가 있어요'
    return `이번 달 냉장고 탐정이 약 ${formatWon(savedAmount)}을 아껴드렸어요!`
  }, [mood, savedAmount])

  return (
    <section aria-label="냉탐이 오늘의 보고" className="mx-4 mb-5">
      <div
        className="relative rounded-3xl px-4 pt-4 pb-4 overflow-hidden border border-gray-200/90"
        style={{
          background: 'linear-gradient(160deg, #EDE3FF 0%, #E5EEFF 40%, #E6F7EC 100%)',
        }}
      >
        {/* Blobs */}
        <span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 180, height: 180, top: -60, right: -50,
            background: '#D7C7FF',
            filter: 'blur(32px)',
            opacity: 0.55,
          }}
        />
        <span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 160, height: 160, bottom: -70, left: -40,
            background: '#BFEBD4',
            filter: 'blur(32px)',
            opacity: 0.55,
          }}
        />
        {/* Sparks */}
        <span
          aria-hidden
          className="absolute text-[#B9A4F2] pointer-events-none text-[14px]"
          style={{ top: 14, right: 18, textShadow: '0 0 6px rgba(185,164,242,0.5)' }}
        >✦</span>
        <span
          aria-hidden
          className="absolute text-[#B9A4F2] pointer-events-none text-[10px] opacity-80"
          style={{ top: 42, right: 38, textShadow: '0 0 6px rgba(185,164,242,0.5)' }}
        >✦</span>

        {/* 캐릭터 + 말풍선 */}
        <div className="relative flex items-center gap-2">
          <div className="shrink-0 w-[120px] h-[120px] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MOOD_IMAGE[mood]}
              alt="냉탐이"
              className="w-[120px] h-[120px] object-contain"
              draggable={false}
            />
          </div>

          <div className="relative flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 px-3.5 py-3 self-center">
            {/* 말풍선 꼬리 */}
            <span
              aria-hidden
              className="absolute bg-white"
              style={{
                left: -6, top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
                width: 12, height: 12,
                borderLeft: '1px solid #E5E7EB',
                borderBottom: '1px solid #E5E7EB',
                borderBottomLeftRadius: 2,
              }}
            />
            <p className="text-[14px] font-bold text-gray-800 leading-snug break-keep m-0">
              {title}
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        {(onClickAddIngredient || onClickFindRecipeWithDetective) && (
          <div className="relative mt-3 flex flex-wrap gap-2">
            {onClickAddIngredient && (
              <button
                onClick={onClickAddIngredient}
                className="flex-1 min-w-[140px] h-11 px-3 rounded-2xl text-[13px] font-semibold text-white bg-[#13AF70] active:scale-[0.98] transition-transform break-keep"
              >
                재료 추가하기
              </button>
            )}
            {onClickFindRecipeWithDetective && (
              <button
                onClick={onClickFindRecipeWithDetective}
                className="flex-1 min-w-[140px] h-11 px-3 rounded-2xl text-[13px] font-semibold text-white bg-[#1F2937] active:scale-[0.98] transition-transform break-keep"
              >
                탐정과 레시피 찾기
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
