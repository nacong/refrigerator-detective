'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useAppStore } from '@/store/useAppStore'
import { useAddIngredient } from '@/hooks/useIngredients'
import type { Ingredient } from '@/types'

type Phase = 'intro' | 'analyzing' | 'result'

export default function TutorialStep1Page() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { recognizedIngredients, setRecognizedIngredients, updateRecognizedIngredient } = useAppStore()
  const addIngredient = useAddIngredient()

  const [phase, setPhase] = useState<Phase>('intro')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Ingredient>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPhase('analyzing')

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setRecognizedIngredients(data.ingredients ?? [])
        setPhase('result')
      } catch {
        setError('식재료 인식에 실패했어요. 다시 시도해주세요.')
        setPhase('intro')
      }
    }
    reader.readAsDataURL(file)
  }

  const openEditor = (index: number) => {
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
    setIsSaving(true)
    try {
      const toSave = recognizedIngredients.filter((i) => i.name?.trim())
      for (const ingredient of toSave) {
        await addIngredient.mutateAsync({
          name: ingredient.name!,
          emoji: ingredient.emoji || '🥘',
          quantity: ingredient.quantity || '적당량',
          expiryDate: ingredient.expiryDate || '',
          price: ingredient.price ?? 0,
        })
      }
      router.push('/tutorial/step2')
    } catch {
      setError('저장 중 오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  const dday = (expiryDate: string) => {
    const days = Math.ceil(
      (new Date(expiryDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
    )
    return days < 0 ? `D+${Math.abs(days)}` : days === 0 ? 'D-DAY' : `D-${days}`
  }

  return (
    <MobileContainer>
      {/* 헤더 — 진행 도트 */}
      <header className="flex items-center justify-between px-4 safe-top pt-4 pb-3">
        <div className="w-9" />
        <div className="flex gap-1.5">
          <span className="w-6 h-1.5 bg-[#13AF70] rounded-full" />
          <span className="w-6 h-1.5 bg-gray-200 rounded-full" />
        </div>
        <div className="w-9" />
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col px-6">
          <div className="flex flex-col items-center mt-6 mb-8">
            {/* 말풍선 */}
            <div className="relative bg-[#E8F9F1] border border-[#13AF70]/20 rounded-2xl rounded-bl-[4px] px-5 py-4 mb-5 max-w-[270px]">
              <p className="text-[14px] text-gray-700 leading-relaxed text-center">
                안녕하세요! 저는 <span className="font-bold text-[#13AF70]">냉탐이</span>예요 🕵️<br />
                냉장고 속 재료를 관리하고<br />
                맛있는 레시피를 찾아드릴게요!
              </p>
              <div className="absolute -bottom-2.5 left-7 w-0 h-0
                border-l-[10px] border-l-transparent
                border-r-[0px] border-r-transparent
                border-t-[10px] border-t-[#E8F9F1]" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/character.jpg" alt="냉탐이" className="w-24 h-24 rounded-full object-cover" />
          </div>

          <div className="bg-gray-50 rounded-2xl p-5">
            <p className="text-[13px] font-semibold text-gray-700 mb-2">📸 첫 번째 단계</p>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              냉장고 사진을 찍으면<br />제가 식재료를 자동으로 찾아낼게요!
            </p>
          </div>

          {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
        </div>
      )}

      {/* ── ANALYZING ── */}
      {phase === 'analyzing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/character.jpg" alt="냉탐이" className="w-24 h-24 rounded-full object-cover" />
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#13AF70] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[15px] font-semibold text-gray-700">열심히 탐색 중이에요!</p>
            <p className="text-[13px] text-gray-400 mt-1">잠시만 기다려주세요...</p>
          </div>
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && (
        <>
          <div className="flex items-end gap-3 px-4 pt-3 pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/character.jpg" alt="냉탐이" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="bg-[#E8F9F1] border border-[#13AF70]/20 rounded-2xl rounded-bl-[4px] px-4 py-3">
              <p className="text-[13px] text-gray-700 leading-relaxed">
                찾았어요! 유통기한도 입력해주면<br />
                더 꼼꼼하게 관리해드릴게요 😊<br />
                <span className="text-[11px] text-gray-400">카드를 탭하면 수정할 수 있어요</span>
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-28 no-scrollbar">
            <div className="grid grid-cols-3 gap-2 mt-2">
              {recognizedIngredients.map((ingredient, index) => (
                <button
                  key={ingredient.id || index}
                  onClick={() => openEditor(index)}
                  className="relative bg-white border border-gray-200 rounded-[14px] pt-[10px] pb-[9px] px-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  {ingredient.expiryDate ? (
                    <span className="absolute top-1.5 left-1.5 text-[9.5px] font-medium px-1.5 py-px rounded-full bg-[#E8F9F1] text-[#13AF70] leading-tight">
                      {dday(ingredient.expiryDate)}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 left-1.5 text-[9.5px] font-medium px-1.5 py-px rounded-full bg-orange-50 text-orange-400 leading-tight whitespace-nowrap">
                      날짜 입력
                    </span>
                  )}
                  <span className="text-[22px] mt-1">{ingredient.emoji}</span>
                  <p className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                    {ingredient.name}
                    <span className="text-gray-400 font-normal ml-0.5">{ingredient.quantity}</span>
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── 편집 bottom sheet ── */}
      {editingIndex !== null && (
        <>
          <div className="absolute inset-0 bg-black/30 z-10" onClick={handleSaveEdit} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-20 px-6 pt-6 pb-8 safe-bottom">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <h2 className="text-base font-bold text-gray-800 mb-4">식재료 정보 수정</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">이름</label>
                <input type="text" value={editValues.name || ''} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">수량/용량</label>
                <input type="text" value={editValues.quantity || ''} onChange={(e) => setEditValues((v) => ({ ...v, quantity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">유통기한</label>
                <input type="date" value={editValues.expiryDate || ''} onChange={(e) => setEditValues((v) => ({ ...v, expiryDate: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">가격 (원)</label>
                <input type="number" min="0" value={editValues.price ?? ''} onChange={(e) => setEditValues((v) => ({ ...v, price: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="예: 3500" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]" />
              </div>
            </div>
            <button onClick={handleSaveEdit} className="w-full bg-[#13AF70] text-white font-semibold py-3.5 rounded-2xl mt-5 active:scale-[0.98] transition-transform">
              저장하기
            </button>
          </div>
        </>
      )}

      {/* ── 하단 버튼 ── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 safe-bottom">
        {phase === 'intro' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span>📸</span>
            <span>사진 찍기</span>
          </button>
        )}
        {phase === 'result' && (
          <>
            {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}
            <button
              onClick={handleNext}
              disabled={isSaving || recognizedIngredients.length === 0}
              className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>저장 중...</span></>
              ) : (
                <span>다음 →</span>
              )}
            </button>
          </>
        )}
      </div>
    </MobileContainer>
  )
}
