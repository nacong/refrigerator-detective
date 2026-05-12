'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import ProgressBar from '@/components/ui/ProgressBar'
import { useAppStore } from '@/store/useAppStore'
import { useAddIngredient } from '@/hooks/useIngredients'
import type { Ingredient } from '@/types'

function AIStep2Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const { recognizedIngredients, updateRecognizedIngredient } = useAppStore()
  const addIngredient = useAddIngredient()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Ingredient>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditValues(recognizedIngredients[index])
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      updateRecognizedIngredient(editingIndex, editValues)
    }
    setEditingIndex(null)
    setEditValues({})
  }

  const handleNext = async () => {
    setSaveError(null)
    setIsSaving(true)

    const toSave = recognizedIngredients.filter((i) => i.name?.trim())

    if (toSave.length === 0) {
      setSaveError('저장할 식재료가 없습니다. 식재료를 먼저 인식해주세요.')
      setIsSaving(false)
      return
    }

    try {
      for (const ingredient of toSave) {
        await addIngredient.mutateAsync({
          name: ingredient.name!,
          emoji: ingredient.emoji || '🥘',
          quantity: ingredient.quantity || '적당량',
          expiryDate: ingredient.expiryDate || '',
          price: ingredient.price ?? 0,
        })
      }
      router.push(from === 'rescue-list' ? '/rescue-list' : '/')
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '저장 중 오류가 발생했습니다. 다시 시도해주세요.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MobileContainer>
      <header className="safe-top pt-4 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pb-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            aria-label="뒤로가기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-gray-800">AI 식재료 인식</h1>
        </div>
        <ProgressBar currentStep={2} totalSteps={2} />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 no-scrollbar">
        <p className="text-sm text-gray-500 mb-4">
          인식된 식재료의 유통기한을 입력해주세요.<br />
          카드를 탭하면 수정할 수 있어요.
        </p>

        {recognizedIngredients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="text-5xl">📷</span>
            <p className="text-sm text-gray-400 text-center">
              인식된 식재료가 없어요.<br />
              사진을 다시 찍어주세요.
            </p>
            <button
              onClick={() => router.back()}
              className="text-sm text-[#13AF70] font-medium"
            >
              ← 다시 촬영하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {recognizedIngredients.map((ingredient, index) => (
              <button
                key={ingredient.id || index}
                onClick={() => handleEdit(index)}
                className="relative bg-white border border-gray-200 rounded-[14px] pt-[10px] pb-[9px] px-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
              >
                {/* D-day 뱃지 — 좌상단 고정 */}
                {ingredient.expiryDate ? (
                  <span className="absolute top-1.5 left-1.5 text-[9.5px] font-medium px-1.5 py-px rounded-full bg-[#E8F9F1] text-[#13AF70] leading-tight">
                    {(() => {
                      const days = Math.ceil((new Date(ingredient.expiryDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
                      return days < 0 ? `D+${Math.abs(days)}` : days === 0 ? 'D-DAY' : `D-${days}`
                    })()}
                  </span>
                ) : (
                  <span className="absolute top-1.5 left-1.5 text-[9.5px] font-medium px-1.5 py-px rounded-full bg-orange-50 text-orange-400 leading-tight whitespace-nowrap">
                    날짜 입력
                  </span>
                )}
                <span className="text-[22px] mt-1">{ingredient.emoji}</span>
                <p className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                  {ingredient.name}<span className="text-gray-400 font-normal ml-0.5">{ingredient.quantity}</span>
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {editingIndex !== null && (
        <>
          <div className="absolute inset-0 bg-black/30 z-10" onClick={handleSaveEdit} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-20 px-6 pt-6 pb-8 safe-bottom">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <h2 className="text-base font-bold text-gray-800 mb-4">식재료 정보 수정</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">이름</label>
                <input
                  type="text"
                  value={editValues.name || ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">수량/용량</label>
                <input
                  type="text"
                  value={editValues.quantity || ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, quantity: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">유통기한</label>
                <input
                  type="date"
                  value={editValues.expiryDate || ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, expiryDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">가격 (원)</label>
                <input
                  type="number"
                  min="0"
                  value={editValues.price ?? ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, price: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder="예: 3500"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]"
                />
              </div>
            </div>

            <button
              onClick={handleSaveEdit}
              className="w-full bg-[#13AF70] text-white font-semibold py-3.5 rounded-2xl mt-5 active:scale-[0.98] transition-transform"
            >
              저장하기
            </button>
          </div>
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 safe-bottom">
        {saveError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
            {saveError}
          </div>
        )}
        <button
          onClick={handleNext}
          disabled={isSaving || recognizedIngredients.length === 0}
          className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>저장 중...</span>
            </>
          ) : from === 'rescue-list' ? (
            <>
              <span>✅</span>
              <span>저장하고 구조대 목록으로</span>
            </>
          ) : (
            <>
              <span>🕵️</span>
              <span>냉탐이와 건강한 식생활 시작하기</span>
            </>
          )}
        </button>
      </div>
    </MobileContainer>
  )
}

export default function AIStep2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AIStep2Content />
    </Suspense>
  )
}
