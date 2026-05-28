'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
import ExpiryBadge from '@/components/ui/ExpiryBadge'
import { useIngredients, useDeleteIngredient } from '@/hooks/useIngredients'
import { useQueryClient } from '@tanstack/react-query'
import { getCoupangSearchUrl } from '@/lib/coupang'
import type { Ingredient, IngredientLocation, IngredientCategory } from '@/types'

// 마일스톤 정의
const MILESTONES: Record<number, { emoji: string; title: string }> = {
  1:  { emoji: '🌱', title: '첫 냉털 달성!' },
  5:  { emoji: '🥕', title: '냉털 초보 달성!' },
  10: { emoji: '⭐', title: '냉털 달인 달성!' },
  20: { emoji: '🏆', title: '냉털 전문가 달성!' },
  50: { emoji: '👑', title: '냉털 마스터 달성!' },
}

// 카테고리 — 신선도 순 (유통기한 짧은 것부터)
const CATEGORIES: { key: IngredientCategory; icon: string; color: string; badgeClass: string }[] = [
  { key: '채소/과일',   icon: '🥬', color: 'bg-green-50',  badgeClass: 'bg-green-100 text-green-700' },
  { key: '육류/해산물', icon: '🥩', color: 'bg-red-50',    badgeClass: 'bg-red-100 text-red-600' },
  { key: '유제품/계란', icon: '🥛', color: 'bg-yellow-50', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { key: '반조리식품',    icon: '🍞', color: 'bg-orange-50',  badgeClass: 'bg-orange-100 text-orange-700' },
  { key: '남은음식/반찬', icon: '🍱', color: 'bg-purple-50', badgeClass: 'bg-purple-100 text-purple-700' },
  { key: '양념/소스',   icon: '🫙', color: 'bg-gray-50',   badgeClass: 'bg-gray-100 text-gray-600' },
  { key: '기타',        icon: '📦', color: 'bg-gray-50',   badgeClass: 'bg-gray-100 text-gray-500' },
]

// 카테고리별 추천 재료 (한국 요리 사용 빈도 기준)
const RECOMMENDED: Record<IngredientCategory, { name: string; emoji: string; percent: number }[]> = {
  '채소/과일':   [
    { name: '대파', emoji: '🌿', percent: 78 },
    { name: '마늘', emoji: '🧄', percent: 85 },
    { name: '양파', emoji: '🧅', percent: 82 },
    { name: '당근', emoji: '🥕', percent: 65 },
    { name: '감자', emoji: '🥔', percent: 71 },
    { name: '청양고추', emoji: '🌶️', percent: 58 },
  ],
  '육류/해산물': [
    { name: '달걀', emoji: '🥚', percent: 91 },
    { name: '돼지고기', emoji: '🥩', percent: 72 },
    { name: '닭가슴살', emoji: '🍗', percent: 68 },
    { name: '새우', emoji: '🦐', percent: 55 },
    { name: '참치캔', emoji: '🐟', percent: 61 },
  ],
  '유제품/계란': [
    { name: '버터', emoji: '🧈', percent: 61 },
    { name: '슬라이스치즈', emoji: '🧀', percent: 58 },
    { name: '우유', emoji: '🥛', percent: 73 },
    { name: '플레인요거트', emoji: '🍶', percent: 44 },
  ],
  '양념/소스':   [
    { name: '간장', emoji: '🍶', percent: 89 },
    { name: '참기름', emoji: '🫙', percent: 77 },
    { name: '고추장', emoji: '🌶️', percent: 71 },
    { name: '된장', emoji: '🫙', percent: 65 },
    { name: '굴소스', emoji: '🫙', percent: 52 },
  ],
  '반조리식품':    [
    { name: '두부', emoji: '⬜', percent: 69 },
    { name: '어묵', emoji: '🍢', percent: 56 },
    { name: '김', emoji: '🟫', percent: 63 },
    { name: '떡', emoji: '🍡', percent: 48 },
  ],
  '남은음식/반찬': [],
  '기타':        [
    { name: '식용유', emoji: '🫙', percent: 92 },
    { name: '소금', emoji: '🧂', percent: 95 },
    { name: '후추', emoji: '🌑', percent: 81 },
    { name: '설탕', emoji: '🍬', percent: 76 },
  ],
}

// 위치 뱃지
const LOCATION_META: Record<IngredientLocation, { icon: string; label: string }> = {
  냉장실: { icon: '❄️', label: '냉장실' },
  냉동실: { icon: '🧊', label: '냉동실' },
  실온:   { icon: '🌡️', label: '실온' },
}

const CATEGORY_BADGE: Record<IngredientCategory, string> = Object.fromEntries(
  CATEGORIES.map(({ key, badgeClass }) => [key, badgeClass])
) as Record<IngredientCategory, string>

interface Toast {
  id: number
  name: string
  count: number
  isMilestone: boolean
}

export default function RescueListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: ingredients = [], isLoading } = useIngredients()
  const deleteIngredient = useDeleteIngredient()

  const [toasts, setToasts] = useState<Toast[]>([])
  // 아코디언 상태 — 기본 전체 열림
  const [collapsed, setCollapsed] = useState<Record<IngredientCategory, boolean>>({
    '채소/과일': false,
    '육류/해산물': false,
    '유제품/계란': false,
    '반조리식품': false,
    '남은음식/반찬': false,
    '양념/소스': false,
    '기타': false,
  })
  // 위치/카테고리 편집 바텀시트
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null)
  const [editLocation, setEditLocation] = useState<IngredientLocation>('냉장실')
  const [editCategory, setEditCategory] = useState<IngredientCategory>('기타')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const showToast = (toast: Toast) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 2800)
  }

  const handleDelete = (ingredient: Ingredient) => {
    deleteIngredient.mutate(ingredient.id, {
      onSuccess: async () => {
        try {
          const res = await fetch('/api/supabase/user-stats', { method: 'POST' })
          if (res.ok) {
            const { cleared_count } = await res.json()
            queryClient.invalidateQueries({ queryKey: ['user-stats'] })
            showToast({
              id: Date.now(),
              name: ingredient.name,
              count: cleared_count,
              isMilestone: !!MILESTONES[cleared_count],
            })
          }
        } catch { /* 실패해도 무시 */ }
      },
    })
  }

  const openEdit = (ingredient: Ingredient) => {
    setEditTarget(ingredient)
    setEditLocation(ingredient.location ?? '냉장실')
    setEditCategory(ingredient.category ?? '기타')
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setIsSavingEdit(true)
    try {
      await fetch('/api/supabase/ingredients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, location: editLocation, category: editCategory }),
      })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    } catch { /* ignore */ } finally {
      setIsSavingEdit(false)
      setEditTarget(null)
    }
  }

  const toggleCollapse = (cat: IngredientCategory) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  // 알림 카드 계산
  const [alertDismissed, setAlertDismissed] = useState(false)

  const alert = (() => {
    if (alertDismissed || ingredients.length === 0) return null
    const todayMs = new Date().setHours(0, 0, 0, 0)

    // 1순위: 1~2일 이내 임박 재료
    const urgent = [...ingredients]
      .map((i) => ({ ...i, days: Math.ceil((new Date(i.expiryDate).setHours(0, 0, 0, 0) - todayMs) / 86400000) }))
      .filter((i) => i.days >= 0 && i.days <= 2)
      .sort((a, b) => a.days - b.days)[0]

    if (urgent) {
      const label = urgent.days === 0 ? '오늘이 마지막이에요!' : `${urgent.days}일 남았어요!`
      return { type: 'urgent' as const, ingredient: urgent, label }
    }

    // 2순위: 3일 이내 등록된 재료 → 최근 구매
    const recent = [...ingredients]
      .filter((i) => {
        if (!i.createdAt) return false
        const diffDays = (Date.now() - new Date(i.createdAt).getTime()) / 86400000
        return diffDays <= 3
      })
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0]
    if (recent) return { type: 'recent' as const, ingredient: recent, label: '' }

    return null
  })()

  return (
    <MobileContainer fullHeight>
      {/* 헤더 */}
      <header className="px-4 pb-3 border-b border-gray-100" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900">나의 식재료</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">재료를 탭하면 위치·카테고리를 바꿀 수 있어요</p>
      </header>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 no-scrollbar space-y-3">

        {/* 알림 카드 */}
        {!isLoading && alert && (
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
            alert.type === 'urgent'
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-[#F0FBF5] border border-[#B6EDD4]'
          }`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={alert.type === 'urgent' ? '/images/detective_warning.png' : '/images/detective_idea.png'}
              alt="냉탐이"
              className="w-11 h-11 object-contain flex-shrink-0"
            />
            <p className="text-[13px] leading-snug flex-1 font-medium text-gray-800">
              {alert.type === 'urgent'
                ? <><span className="font-bold text-orange-500">{alert.ingredient.name}</span> 유통기한이 {alert.label}</>
                : <>최근에 구매한 <span className="font-bold text-[#13AF70]">{alert.ingredient.name}</span> 잘 쓰고 계신가요?</>
              }
            </p>
            <button
              onClick={() => setAlertDismissed(true)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-black/10 active:bg-black/20"
              aria-label="닫기"
            >
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[110px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {CATEGORIES.map(({ key, icon, color }) => {
              // 카테고리 필터 후 날짜 오름차순 정렬
              const group = ingredients
                .filter((i) => (i.category ?? '기타') === key)
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
              const isCollapsed = collapsed[key]
              return (
                <div key={key} className={`${color} rounded-2xl overflow-hidden`}>
                  {/* 섹션 헤더 */}
                  <button
                    onClick={() => toggleCollapse(key)}
                    className="w-full flex items-center justify-between px-4 py-3 active:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <span className="text-[14px] font-bold text-gray-800">{key}</span>
                      <span className="text-[11px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        {group.length}개
                      </span>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* 그리드 */}
                  {!isCollapsed && (
                    <div className="pb-3">
                      <div className="px-3">
                        {group.length === 0 ? (
                          <button
                            onClick={() => router.push('/ai-recognition?from=rescue-list')}
                            className="w-full flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-gray-200 rounded-xl active:bg-white/50 transition-colors"
                          >
                            <span className="text-xl text-gray-300">+</span>
                            <p className="text-xs text-gray-400">아직 없어요 — 추가해볼까요?</p>
                          </button>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {group.map((ingredient) => (
                              <IngredientCard
                                key={ingredient.id}
                                ingredient={ingredient}
                                onDelete={() => handleDelete(ingredient)}
                                onTap={() => openEdit(ingredient)}
                              />
                            ))}
                            <button
                              onClick={() => router.push('/ai-recognition?from=rescue-list')}
                              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl active:bg-white/50 transition-colors"
                              style={{ minHeight: 100 }}
                            >
                              <span className="text-xl text-gray-300 font-light">+</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 추천 재료 */}
                      <RecommendedRow category={key} existingIngredients={ingredients} />
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      <BottomNavigation active="fridge" />

      {/* 위치/카테고리 편집 바텀시트 */}
      {editTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setEditTarget(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-40 px-5 pt-6 pb-10 safe-bottom max-w-[430px] mx-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">{editTarget.emoji}</span>
              <p className="text-[15px] font-bold text-gray-900">{editTarget.name}</p>
            </div>

            {/* 위치 선택 */}
            <p className="text-xs font-semibold text-gray-500 mb-2">보관 위치</p>
            <div className="flex gap-2 mb-5">
              {(Object.entries(LOCATION_META) as [IngredientLocation, { icon: string; label: string }][]).map(([key, { icon, label }]) => (
                <button
                  key={key}
                  onClick={() => setEditLocation(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                    editLocation === key
                      ? 'border-[#13AF70] bg-[#F0FBF5] text-[#13AF70]'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-[11px]">{label}</span>
                </button>
              ))}
            </div>

            {/* 카테고리 선택 */}
            <p className="text-xs font-semibold text-gray-500 mb-2">카테고리</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {CATEGORIES.map(({ key: cat, icon }) => (
                <button
                  key={cat}
                  onClick={() => setEditCategory(cat)}
                  className={`py-2 px-1 rounded-xl border-2 text-[11px] font-medium transition-colors ${
                    editCategory === cat
                      ? 'border-[#13AF70] bg-[#F0FBF5] text-[#13AF70]'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {icon} {cat}
                </button>
              ))}
            </div>

            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="w-full bg-[#13AF70] text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {isSavingEdit ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </>
      )}

      {/* 토스트 스택 */}
      <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 px-6 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full max-w-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              toast.isMilestone ? 'bg-[#13AF70] text-white' : 'bg-gray-900 text-white'
            }`}
          >
            <span className="text-xl flex-shrink-0">
              {toast.isMilestone ? MILESTONES[toast.count]?.emoji : '🧹'}
            </span>
            <div className="flex-1 min-w-0">
              {toast.isMilestone ? (
                <>
                  <p className="text-[13px] font-bold leading-tight">{MILESTONES[toast.count]?.title}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">냉털 {toast.count}개 돌파! 대단해요 🎉</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold leading-tight">{toast.name} 냉털 완료!</p>
                  <p className="text-[11px] opacity-60 mt-0.5">총 {toast.count}개 처리했어요</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </MobileContainer>
  )
}

// 식재료 카드 컴포넌트
function IngredientCard({
  ingredient,
  onDelete,
  onTap,
}: {
  ingredient: Ingredient
  onDelete: () => void
  onTap: () => void
}) {
  const loc = ingredient.location ?? '냉장실'
  const { icon: locIcon } = LOCATION_META[loc as IngredientLocation] ?? LOCATION_META['냉장실']

  return (
    <button
      onClick={onTap}
      className="relative bg-white border border-gray-200 rounded-xl px-2 pt-2 pb-2.5 flex flex-col items-center gap-1 active:scale-95 transition-transform text-left w-full"
      style={{ minHeight: 100 }}
    >
      {/* 상단: D-day 뱃지(좌) + 삭제(우) */}
      <div className="w-full flex items-center justify-between">
        <ExpiryBadge expiryDate={ingredient.expiryDate} size="sm" />
        <span
          role="button"
          aria-label={`${ingredient.name} 삭제`}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-[9px] active:bg-red-100 active:text-red-400"
        >
          ✕
        </span>
      </div>

      {/* 이모지 */}
      <span className="text-[30px] leading-none">{ingredient.emoji}</span>

      {/* 재료명 */}
      <p className="text-[11px] font-bold text-gray-900 truncate w-full text-center">{ingredient.name}</p>

      {/* 위치 뱃지 */}
      <span className="text-[9px] text-gray-400">{locIcon} {loc}</span>
    </button>
  )
}

// 카테고리별 추천 재료 행
function RecommendedRow({
  category,
  existingIngredients,
}: {
  category: IngredientCategory
  existingIngredients: Ingredient[]
}) {
  const existingNames = new Set(existingIngredients.map((i) => i.name.toLowerCase()))
  const candidates = RECOMMENDED[category] ?? []
  const toShow = candidates.filter((r) => !existingNames.has(r.name.toLowerCase())).slice(0, 4)

  if (toShow.length === 0) return null

  return (
    <div className="mt-2.5 px-3">
      <p className="text-[10px] text-gray-400 mb-1.5 pl-0.5">없으면 아쉬운 재료</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {toShow.map(({ name, emoji, percent }) => (
          <a
            key={name}
            href={getCoupangSearchUrl(name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-3 py-2.5 active:opacity-70 transition-opacity"
          >
            <span className="text-[18px] leading-none">{emoji}</span>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-gray-800 whitespace-nowrap">{name}</span>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{percent}%의 음식에 쓰여요</span>
            </div>
            <span className="text-[9px] font-black text-[#C00] tracking-tight ml-1 whitespace-nowrap">쿠팡 →</span>
          </a>
        ))}
      </div>
    </div>
  )
}
