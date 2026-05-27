'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
import ExpiryBadge from '@/components/ui/ExpiryBadge'
import { useIngredients, useDeleteIngredient } from '@/hooks/useIngredients'
import { useQueryClient } from '@tanstack/react-query'
import type { Ingredient } from '@/types'

// 마일스톤 정의
const MILESTONES: Record<number, { emoji: string; title: string }> = {
  1:  { emoji: '🌱', title: '첫 냉털 달성!' },
  5:  { emoji: '🥕', title: '냉털 초보 달성!' },
  10: { emoji: '⭐', title: '냉털 달인 달성!' },
  20: { emoji: '🏆', title: '냉털 전문가 달성!' },
  50: { emoji: '👑', title: '냉털 마스터 달성!' },
}

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

  const sortedIngredients = [...ingredients].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  )

  const showToast = (toast: Toast) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 2800)
  }

  const handleDelete = (ingredient: Ingredient) => {
    deleteIngredient.mutate(ingredient.id, {
      onSuccess: async () => {
        // 냉털 카운트 증가
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

  return (
    <MobileContainer fullHeight>
      {/* 헤더 */}
      <header className="px-4 pb-3 border-b border-gray-100" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900">나의 식재료</h1>
      </header>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 no-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[110px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sortedIngredients.map((ingredient) => (
              <IngredientCard
                key={ingredient.id}
                ingredient={ingredient}
                onDelete={() => handleDelete(ingredient)}
              />
            ))}

            {/* 식재료 추가 카드 */}
            <button
              onClick={() => router.push('/ai-recognition?from=rescue-list')}
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl active:bg-gray-50 transition-colors"
              style={{ minHeight: 100 }}
            >
              <span className="text-xl text-gray-300 font-light">+</span>
              <span className="text-xs text-gray-400 font-medium">식재료 추가</span>
            </button>
          </div>
        )}
      </div>

      <BottomNavigation active="fridge" />

      {/* 토스트 스택 */}
      <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 px-6 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full max-w-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              toast.isMilestone
                ? 'bg-[#13AF70] text-white'
                : 'bg-gray-900 text-white'
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
}: {
  ingredient: Ingredient
  onDelete: () => void
}) {
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl px-2 pt-2 pb-2.5 flex flex-col items-center gap-1.5" style={{ minHeight: 100 }}>
      {/* 상단: D-day 뱃지(좌) + 삭제(우) */}
      <div className="w-full flex items-center justify-between">
        <ExpiryBadge expiryDate={ingredient.expiryDate} size="sm" />
        <button
          onClick={onDelete}
          className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-[9px] active:bg-red-100 active:text-red-400"
          aria-label={`${ingredient.name} 삭제`}
        >
          ✕
        </button>
      </div>

      {/* 이모지 */}
      <span className="text-[32px] leading-none">{ingredient.emoji}</span>

      {/* 재료명 + 수량 */}
      <div className="flex items-baseline justify-center gap-1 w-full">
        <p className="text-[12px] font-bold text-gray-900 truncate">{ingredient.name}</p>
        {ingredient.quantity && (
          <span className="text-[12px] font-bold text-gray-900 flex-shrink-0">{ingredient.quantity}</span>
        )}
      </div>
    </div>
  )
}
