'use client'

import { useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useAppStore } from '@/store/useAppStore'
import { useAddIngredient } from '@/hooks/useIngredients'
import type { Ingredient } from '@/types'

type Phase = 'picking' | 'processing' | 'result' | 'manual'

const getOneWeekLater = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const DEFAULT_MANUAL_FORM = () => ({ name: '', emoji: '', quantity: '', expiryDate: getOneWeekLater() })

function AIRecognitionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('picking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Ingredient>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState(DEFAULT_MANUAL_FORM)
  const [manualError, setManualError] = useState<string | null>(null)

  const {
    setCapturedImage,
    setRecognizedIngredients,
    recognizedIngredients,
    updateRecognizedIngredient,
    removeRecognizedIngredient,
  } = useAppStore()
  const addIngredient = useAddIngredient()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const [header, base64] = dataUrl.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
      setCapturedImage(base64, mimeType)

      setPhase('processing')
      setErrorMessage(null)
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        })
        const data = await res.json()
        if (!res.ok) {
          setErrorMessage(data.error || `오류가 발생했습니다 (${res.status})`)
          setPhase('picking')
          return
        }
        setRecognizedIngredients(data.ingredients || [])
        setPhase('result')
      } catch {
        setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
        setPhase('picking')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditValues(recognizedIngredients[index])
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null) updateRecognizedIngredient(editingIndex, editValues)
    setEditingIndex(null)
    setEditValues({})
  }

  const handleManualAdd = () => {
    setManualError(null)
    if (!manualForm.name.trim()) {
      setManualError('식재료 이름을 입력해주세요.')
      return
    }
    const newItem: Partial<Ingredient> = {
      id: `manual-${Date.now()}`,
      name: manualForm.name.trim(),
      emoji: manualForm.emoji.trim() || '🥘',
      quantity: manualForm.quantity.trim() || '적당량',
      expiryDate: manualForm.expiryDate,
    }
    setRecognizedIngredients([...recognizedIngredients, newItem])
    setManualForm(DEFAULT_MANUAL_FORM)
    setPhase('result')
  }

  const handleSave = async () => {
    setSaveError(null)
    setIsSaving(true)
    const toSave = recognizedIngredients.filter((i) => i.name?.trim())
    if (toSave.length === 0) {
      setSaveError('저장할 식재료가 없습니다.')
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
        })
      }
      router.push(from === 'rescue-list' ? '/rescue-list' : '/')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  /* ── manual phase ── */
  if (phase === 'manual') {
    return (
      <div className="fixed inset-0 bg-white flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100" style={{ paddingTop: 'max(52px, calc(env(safe-area-inset-top) + 16px))' }}>
          <button
            onClick={() => { setManualForm(DEFAULT_MANUAL_FORM); setManualError(null); setPhase(recognizedIngredients.length > 0 ? 'result' : 'picking') }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            aria-label="뒤로가기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[17px] font-bold text-gray-900">직접 입력</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 no-scrollbar">
          <div className="space-y-4">
            {/* 이모지 + 이름 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <label className="text-xs text-gray-500 mb-1 block">이모지</label>
                <input
                  type="text"
                  value={manualForm.emoji}
                  onChange={(e) => setManualForm((v) => ({ ...v, emoji: e.target.value }))}
                  placeholder="🥘"
                  maxLength={2}
                  className="w-16 border border-gray-200 rounded-xl px-3 py-3 text-xl text-center outline-none focus:border-[#13AF70]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">식재료 이름 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={manualForm.name}
                  onChange={(e) => setManualForm((v) => ({ ...v, name: e.target.value }))}
                  placeholder="예) 달걀, 당근"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#13AF70]"
                  autoFocus
                />
              </div>
            </div>

            {/* 수량 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">수량/용량</label>
              <input
                type="text"
                value={manualForm.quantity}
                onChange={(e) => setManualForm((v) => ({ ...v, quantity: e.target.value }))}
                placeholder="예) 1개, 200g, 적당량"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#13AF70]"
              />
            </div>

            {/* 유통기한 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">유통기한</label>
              <input
                type="date"
                value={manualForm.expiryDate}
                onChange={(e) => setManualForm((v) => ({ ...v, expiryDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#13AF70]"
              />
            </div>

            {manualError && (
              <p className="text-sm text-red-500">{manualError}</p>
            )}
          </div>
        </div>

        {/* 추가 버튼 */}
        <div className="px-5 pb-8 pt-3 bg-white border-t border-gray-100">
          <button
            onClick={handleManualAdd}
            className="w-full bg-[#13AF70] text-white font-bold py-4 rounded-2xl text-[16px] active:scale-[0.98] transition-transform"
          >
            추가하기
          </button>
        </div>
      </div>
    )
  }

  /* ── picking / processing ── */
  if (phase !== 'result') {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
        {/* 숨김 파일 입력 — 카메라 */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        {/* 숨김 파일 입력 — 갤러리 */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {phase === 'processing' ? (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/detective_finding.png"
              alt="식재료 인식 중"
              className="w-40 h-40 object-contain"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-[3px] border-[#13AF70] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">식재료 인식 중...</p>
            </div>
          </div>
        ) : (
          /* 바텀시트 팝업 */
          <div className="absolute inset-0 bg-black/40 flex items-end justify-center" onClick={() => router.back()}>
            <div
              className="w-full max-w-[430px] bg-white rounded-t-3xl px-6 pt-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
              <h2 className="text-base font-bold text-gray-800 mb-1">식재료 추가</h2>
              {errorMessage && (
                <p className="text-sm text-red-500 mb-3">{errorMessage}</p>
              )}
              <p className="text-sm text-gray-400 mb-5">냉장고 속 재료를 찍거나 직접 입력해주세요</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center gap-4 px-5 py-4 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">📷</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">카메라로 촬영</p>
                    <p className="text-xs text-gray-400 mt-0.5">지금 바로 냉장고를 찍어요</p>
                  </div>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full flex items-center gap-4 px-5 py-4 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">🖼️</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">갤러리에서 선택</p>
                    <p className="text-xs text-gray-400 mt-0.5">저장된 사진을 불러와요</p>
                  </div>
                </button>
                <button
                  onClick={() => setPhase('manual')}
                  className="w-full flex items-center gap-4 px-5 py-4 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">✏️</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">직접 입력</p>
                    <p className="text-xs text-gray-400 mt-0.5">이름, 수량, 유통기한을 직접 써요</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── result ── */
  return (
    <MobileContainer>
      <header className="flex items-center gap-3 px-4 safe-top pt-4 pb-3 border-b border-gray-100">
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
              사진을 다시 찍거나 직접 입력해주세요.
            </p>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setPhase('picking')}
                className="text-sm text-[#13AF70] font-medium"
              >
                ← 다시 촬영하기
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setPhase('manual')}
                className="text-sm text-[#13AF70] font-medium"
              >
                직접 입력하기
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {recognizedIngredients.map((ingredient, index) => (
              <button
                key={ingredient.id || index}
                onClick={() => handleEdit(index)}
                className="relative bg-white border border-gray-200 rounded-[14px] pt-[10px] pb-[9px] px-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
              >
                {/* 삭제 버튼 */}
                <span
                  role="button"
                  aria-label="삭제"
                  onClick={(e) => { e.stopPropagation(); removeRecognizedIngredient(index) }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 active:bg-gray-300"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2L2 8" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>

                {ingredient.expiryDate ? (
                  <span className="absolute top-1.5 left-1.5 text-[9.5px] font-medium px-1.5 py-px rounded-full bg-[#E8F9F1] text-[#13AF70] leading-tight">
                    {(() => {
                      const days = Math.ceil(
                        (new Date(ingredient.expiryDate).setHours(0, 0, 0, 0) -
                          new Date().setHours(0, 0, 0, 0)) / 86400000
                      )
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
                  {ingredient.name}
                  <span className="text-gray-400 font-normal ml-0.5">{ingredient.quantity}</span>
                </p>
              </button>
            ))}

            {/* 직접 추가 카드 */}
            <button
              onClick={() => setPhase('manual')}
              className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-[14px] active:bg-gray-50 transition-colors"
              style={{ minHeight: 88 }}
            >
              <span className="text-xl text-gray-300 font-light leading-none">+</span>
              <span className="text-[11px] text-gray-400 font-medium">직접 추가</span>
            </button>
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
          onClick={handleSave}
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
            <span>재료 추가하기</span>
          )}
        </button>
      </div>
    </MobileContainer>
  )
}

export default function AIRecognitionPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-white" />}>
      <AIRecognitionContent />
    </Suspense>
  )
}
