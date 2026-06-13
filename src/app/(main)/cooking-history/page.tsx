'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
import { useCookingHistory, type CookingHistoryItem } from '@/hooks/useCookingHistory'
import { useAppStore } from '@/store/useAppStore'
import { useQueryClient } from '@tanstack/react-query'

const LONG_PRESS_MS = 500

export default function CookingHistoryPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: history = [], isLoading } = useCookingHistory()
  const setSelectedRecipe = useAppStore((s) => s.setSelectedRecipe)

  const [preview, setPreview] = useState<CookingHistoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CookingHistoryItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const startLongPress = useCallback((item: CookingHistoryItem) => {
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setDeleteTarget(item)
    }, LONG_PRESS_MS)
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  const handlePointerUp = useCallback((item: CookingHistoryItem) => {
    cancelLongPress()
    if (!longPressFired.current) setPreview(item)
  }, [cancelLongPress])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await fetch(`/api/supabase/cooking-history?id=${deleteTarget.id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['cooking-history'] })
      setDeleteTarget(null)
    } catch {
      alert('삭제 중 오류가 발생했어요.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewRecipe = (item: CookingHistoryItem) => {
    setSelectedRecipe({
      name: item.recipe_name,
      cookingMethod: '',
      cookTimeMinutes: item.cook_time,
      ingredientsRaw: item.ingredients.join(', '),
      imageUrl: item.thumbnail_url,
      sourceUrl: '',
      steps: item.steps,
      dbRecipeId: item.db_recipe_id ?? undefined,
    })
    setPreview(null)
    router.push('/cooking-process')
  }

  return (
    <MobileContainer fullHeight>
      <header className="px-4 pb-3 border-b border-gray-100" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900">요리 기록</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 no-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/detective_thinking.png" alt="탐정" className="w-48 h-48 object-contain" />
            <p className="text-lg font-bold text-gray-800">아직 요리 기록이 없어요</p>
            <button
              onClick={() => router.push('/chatbot')}
              className="text-sm text-[#13AF70] font-medium"
            >
              냉탐이에게 레시피 추천받기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(
              history.reduce<Record<string, typeof history>>((acc, item) => {
                const d = new Date(item.cooked_at)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                ;(acc[key] ??= []).push(item)
                return acc
              }, {})
            )
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([key, items]) => {
                const [year, month] = key.split('-')
                const label = Number(year) === new Date().getFullYear()
                  ? `${Number(month)}월`
                  : `${year}년 ${Number(month)}월`
                return (
                  <div key={key}>
                    <p className="text-[15px] font-bold text-gray-800 mb-3">{label}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onPointerDown={() => startLongPress(item)}
                          onPointerUp={() => handlePointerUp(item)}
                          onPointerLeave={cancelLongPress}
                          onContextMenu={(e) => e.preventDefault()}
                          className="aspect-square rounded-2xl overflow-hidden relative active:scale-[0.97] transition-transform w-full select-none"
                        >
                          {item.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnail_url}
                              alt={item.recipe_name}
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                              <span className="text-[56px] leading-none">🍳</span>
                            </div>
                          )}
                          {item.rating != null && (
                            <div className="absolute top-2.5 left-2.5 flex gap-0.5 bg-black/40 rounded-full px-1.5 py-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <svg key={s} width="11" height="11" viewBox="0 0 24 24"
                                  fill={s <= item.rating! ? '#FBBF24' : 'none'}
                                  stroke={s <= item.rating! ? '#FBBF24' : 'rgba(255,255,255,0.4)'}
                                  strokeWidth="1.5"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ))}
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3 pb-3 pt-10">
                            <p className="text-white text-[17px] font-bold line-clamp-2 leading-snug">
                              {item.recipe_name || '알 수 없는 레시피'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      <BottomNavigation active="recipe" />

      {/* 미리보기 팝업 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex flex-col w-full px-8"
            style={{ maxWidth: '360px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[20px] font-bold text-white line-clamp-2 leading-snug mb-3">
              {preview.recipe_name || '알 수 없는 레시피'}
            </h3>

            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-100 to-orange-100">
              {preview.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.thumbnail_url}
                  alt={preview.recipe_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[80px] leading-none">🍳</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 gap-2">
              {preview.cook_time > 0 ? (
                <span className="bg-white/20 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white">
                  ⏱ {preview.cook_time}분
                </span>
              ) : <span />}
              <span className="bg-white/20 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white">
                {new Date(preview.cooked_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <button
              className="w-full h-14 mt-3 rounded-2xl bg-[#13AF70] text-[17px] font-bold text-white active:scale-[0.98] transition-transform"
              onClick={() => handleViewRecipe(preview)}
            >
              레시피 보기
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl px-6 py-6 mx-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[17px] font-bold text-gray-900 mb-1">기록을 삭제할까요?</p>
            <p className="text-sm text-gray-400 mb-6 leading-snug">
              {deleteTarget.recipe_name || '알 수 없는 레시피'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-2xl bg-gray-100 text-[15px] font-semibold text-gray-600 active:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-2xl bg-red-500 text-[15px] font-bold text-white active:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
