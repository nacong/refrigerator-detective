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
  onDismiss?: () => void
  suggestedRecipeName?: string
}

const POPULAR_RECIPES = [
  '제육볶음', '파스타', '김치찌개', '된장찌개', '계란볶음밥',
  '부대찌개', '순두부찌개', '비빔밥', '떡볶음', '닭볶음탕',
  '콩나물국밥', '짜글이', '참치김치찌개', '감자조림', '두부김치',
]

function dailySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function seededPick<T>(arr: T[], salt = 0): T {
  return arr[(dailySeed() + salt) % arr.length]
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default function DetectiveSummaryHero({
  ingredients = [],
  expiringSoonIngredients,
  onClickAddIngredient,
  onClickFindRecipeWithDetective,
  forceMood,
  onDismiss,
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

  const title = useMemo(() => {
    const ingredient = expiringList[0]?.name
    const recipe = seededPick(POPULAR_RECIPES)

    if (mood === 'frontview') return '아직 등록된 재료가 적어요.\n재료를 추가해볼까요?'

    if (ingredient) {
      const isSimple = !ingredient.includes(' ') && ingredient.length <= 6
      const expiringPool = [
        isSimple
          ? `지금 ${ingredient}가 울고 있어요.\n오늘 ${recipe} 어떠세요?`
          : `지금 ${ingredient}가 울고 있어요.`,
        `${ingredient} 아직 있죠?\n오늘이 딱 타이밍이에요!`,
        `${ingredient} 유통기한이 얼마 안 남았어요!\n탐정이 레시피 찾아드릴게요.`,
      ]
      return seededPick(expiringPool, 1)
    }

    const pool: string[] = [
      `오늘은 ${recipe}이 딱인데!`,
      `오늘 저녁은 ${recipe} 어때요?`,
      `${recipe} 한 번 만들어볼까요?`,
      '오늘 뭐 먹을지 탐정한테 물어봐요!',
      '냉장고 탐정이 레시피 준비해뒀어요!',
    ]

    return seededPick(pool, 1)
  }, [mood, expiringList])

  return (
    <section aria-label="냉탐이 오늘의 보고" className="mx-4 mb-5">
      <div
        className="relative rounded-3xl px-4 pt-4 pb-4 overflow-hidden border border-gray-200"
        style={{
          background: 'linear-gradient(160deg, #F5F6F5 0%, #F1F4F2 100%)',
        }}
      >
        {/* Blobs */}
        <span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 180, height: 180, top: -60, right: -50,
            background: '#A8DFC0',
            filter: 'blur(40px)',
            opacity: 0.12,
          }}
        />
        <span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 160, height: 160, bottom: -70, left: -40,
            background: '#6FCF9E',
            filter: 'blur(40px)',
            opacity: 0.1,
          }}
        />
        {/* 닫기 버튼 */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="닫기"
            className="absolute top-3 right-3 z-10 text-gray-400 text-[14px] active:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}

        {/* 캐릭터 — 상단 가운데 */}
        <div className="flex justify-center mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MOOD_IMAGE[mood]}
            alt="냉탐이"
            className="w-[88px] h-[88px] object-contain"
            draggable={false}
          />
        </div>

        {/* 텍스트 — 중앙 정렬 */}
        <p className="text-[17px] font-bold text-gray-800 text-center leading-snug break-keep whitespace-pre-line mb-4">
          {title}
        </p>

        {/* 액션 버튼 */}
        {(onClickAddIngredient || onClickFindRecipeWithDetective) && (
          <div className="flex flex-col gap-2">
            {onClickAddIngredient && (
              <button
                onClick={onClickAddIngredient}
                className="w-full h-12 rounded-2xl text-[16px] font-semibold text-white bg-[#13AF70] active:scale-[0.98] transition-transform"
              >
                재료 추가하기
              </button>
            )}
            {onClickFindRecipeWithDetective && (
              <button
                onClick={onClickFindRecipeWithDetective}
                className="w-full h-12 rounded-2xl text-[16px] font-semibold text-white bg-[#13AF70] active:scale-[0.98] transition-transform"
              >
                냉탐이와 레시피 찾기
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
