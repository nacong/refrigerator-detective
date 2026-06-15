'use client'

import { forwardRef, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useAppStore } from '@/store/useAppStore'
import { useQueryClient } from '@tanstack/react-query'
import type { IngredientUpdate } from '@/app/api/gemini/ingredient-update/route'
import { getCoupangSearchUrl } from '@/lib/coupang'

export default function CookingProcessPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const recipe = useAppStore((s) => s.selectedRecipe)

  const cookingSteps = recipe?.steps ?? []
  const totalSteps = 1 + cookingSteps.length

  const [currentIndex, setCurrentIndex] = useState(1)
  const [completedTimes, setCompletedTimes] = useState<Record<number, string>>({})
  const [isDone, setIsDone] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [actualCookTime, setActualCookTime] = useState(0)

  // 사진 관련
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // 별점
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)

  // 재료 자동 정리
  const [ingredientUpdates, setIngredientUpdates] = useState<IngredientUpdate[]>([])
  const [selectedUpdateIds, setSelectedUpdateIds] = useState<Set<string>>(new Set())
  const [loadingIngredientUpdates, setLoadingIngredientUpdates] = useState(false)
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null)
  const [editingQuantityValue, setEditingQuantityValue] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(Date.now())

  const currentPhase = isDone ? 2 : currentIndex === 0 ? 0 : 1

  const now = () =>
    new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  const handlePrev = () => {
    if (currentIndex <= 1) return
    setCompletedTimes((prev) => {
      const next = { ...prev }
      delete next[currentIndex - 1]
      return next
    })
    setCurrentIndex((i) => i - 1)
  }

  const handleNext = () => {
    const time = now()
    setCompletedTimes((prev) => ({ ...prev, [currentIndex]: time }))
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      // 완성 — 저장은 사진 선택 후 별도 버튼으로
      const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000))
      setActualCookTime(elapsed)
      setCompletedTimes((prev) => ({ ...prev, [totalSteps - 1]: time }))
      setIsDone(true)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    // input 초기화 (같은 파일 재선택 가능하게)
    e.target.value = ''
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 사진 업로드
      let photoUrl = ''
      if (photoFile) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(photoFile)
        })
        const uploadRes = await fetch('/api/supabase/cooking-history/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: photoFile.type }),
        })
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          photoUrl = url as string
        }
      }

      // 요리 기록 저장
      // dbRecipeId 가 없는 AI 레시피는 recipeData 를 함께 보내서 서버에서 fallback insert
      const saveRes = await fetch('/api/supabase/cooking-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: recipe?.name ?? '',
          cookTime: actualCookTime,
          dbRecipeId: recipe?.dbRecipeId ?? null,
          photoUrl,
          rating: rating > 0 ? rating : null,
          // dbRecipeId 가 없을 때만 전체 레시피 데이터 전송
          recipeData: recipe?.dbRecipeId
            ? null
            : {
                cookingMethod: recipe?.cookingMethod ?? '',
                cookTimeMinutes: recipe?.cookTimeMinutes ?? 0,
                ingredientsRaw: recipe?.ingredientsRaw ?? '',
                steps: recipe?.steps ?? [],
              },
        }),
      })

      if (!saveRes.ok) {
        let errMsg = `HTTP ${saveRes.status}`
        try {
          const json = await saveRes.json()
          if (json?.error) errMsg = json.error
        } catch { /* ignore parse error */ }
        throw new Error(errMsg)
      }

      // 재료 자동 정리 적용
      const toUpdate = ingredientUpdates.filter((u) => selectedUpdateIds.has(u.id))
      if (toUpdate.length > 0) {
        await Promise.allSettled(
          toUpdate.map((u) =>
            u.action === 'remove'
              ? fetch(`/api/supabase/ingredients?id=${u.id}`, { method: 'DELETE' })
              : fetch('/api/supabase/ingredients', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: u.id, quantity: u.newQuantity }),
                })
          )
        )
        queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      }

      queryClient.invalidateQueries({ queryKey: ['cooking-history'] })
      router.push('/cooking-history')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류'
      alert(`저장 중 오류가 발생했어요.\n${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  // 요리 완성 시 Gemini로 재료 소비 분석
  useEffect(() => {
    if (!isDone || !recipe) return
    setLoadingIngredientUpdates(true)
    ;(async () => {
      try {
        const ingredientsRes = await fetch('/api/supabase/ingredients')
        if (!ingredientsRes.ok) return
        const currentIngredients = await ingredientsRes.json()
        if (!currentIngredients.length) return

        const res = await fetch('/api/gemini/ingredient-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeName: recipe.name,
            ingredientsUsed: recipe.ingredientsRaw ?? '',
            currentIngredients,
          }),
        })
        if (!res.ok) return
        const { updates } = await res.json() as { updates: IngredientUpdate[] }
        setIngredientUpdates(updates)
        setSelectedUpdateIds(new Set(updates.map((u) => u.id)))
      } catch { /* 실패해도 무시 */ } finally {
        setLoadingIngredientUpdates(false)
      }
    })()
  }, [isDone, recipe])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentIndex, isDone])

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

        {/* 완성 배너 */}
        {isDone && (
          <>
            <div ref={scrollRef} className="flex items-center gap-3 bg-[#F0FBF5] rounded-2xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-[#13AF70] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-bold text-[#0D9E63] flex-1">요리 완성! 🎉</p>
              <span className="text-xs text-gray-400">{completedTimes[totalSteps - 1]}</span>
            </div>

            {/* ── 별점 섹션 ── */}
            <div className="bg-gray-50 rounded-2xl px-4 py-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">⭐ 오늘 요리는 어땠나요?</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star === rating ? 0 : star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform active:scale-90"
                    aria-label={`${star}점`}
                  >
                    <svg
                      width="36" height="36" viewBox="0 0 24 24"
                      fill={(hoverRating || rating) >= star ? '#FBBF24' : 'none'}
                      stroke={(hoverRating || rating) >= star ? '#FBBF24' : '#D1D5DB'}
                      strokeWidth="1.5"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  {['', '아쉬웠어요 😢', '그저 그랬어요 😐', '괜찮았어요 🙂', '맛있었어요 😋', '최고예요! 🤩'][rating]}
                </p>
              )}
            </div>

            {/* ── 재료 자동 정리 섹션 ── */}
            <div className="bg-gray-50 rounded-2xl px-4 py-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">🧹 사용한 재료 정리</p>

              {loadingIngredientUpdates ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-[#13AF70] rounded-full animate-spin flex-shrink-0" />
                  <span className="text-xs text-gray-400">사용한 재료 분석 중...</span>
                </div>
              ) : ingredientUpdates.length === 0 ? (
                <p className="text-xs text-gray-400">냉장고에 연관 재료가 없어요</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {ingredientUpdates.map((u) => {
                    const selected = selectedUpdateIds.has(u.id)
                    return (
                      <button
                        key={u.id}
                        onClick={() =>
                          setSelectedUpdateIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(u.id)) next.delete(u.id)
                            else next.add(u.id)
                            return next
                          })
                        }
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          selected ? 'bg-white border-gray-200' : 'bg-white border-gray-100 opacity-40'
                        }`}
                      >
                        {/* 체크 */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'bg-[#13AF70] border-[#13AF70]' : 'border-gray-300'
                        }`}>
                          {selected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-base flex-shrink-0">{u.emoji}</span>
                        <span className="text-sm font-medium text-gray-800 flex-1">{u.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {u.oldQuantity && (
                            <span className="text-xs text-gray-400 line-through">{u.oldQuantity}</span>
                          )}
                          {u.action === 'remove' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setIngredientUpdates((prev) =>
                                  prev.map((item) =>
                                    item.id === u.id ? { ...item, action: 'update', newQuantity: '' } : item
                                  )
                                )
                                setEditingQuantityId(u.id)
                                setEditingQuantityValue('')
                              }}
                              className="text-xs font-medium text-red-400 underline underline-offset-2 decoration-dashed"
                            >
                              전부 사용됨
                            </button>
                          ) : editingQuantityId === u.id ? (
                            <input
                              type="text"
                              value={editingQuantityValue}
                              onChange={(e) => setEditingQuantityValue(e.target.value)}
                              onBlur={() => {
                                if (editingQuantityValue.trim()) {
                                  setIngredientUpdates((prev) =>
                                    prev.map((item) =>
                                      item.id === u.id ? { ...item, newQuantity: editingQuantityValue.trim() } : item
                                    )
                                  )
                                }
                                setEditingQuantityId(null)
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-orange-400 bg-orange-50 border-b border-orange-400 outline-none w-16 text-center"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingQuantityId(u.id)
                                setEditingQuantityValue(u.newQuantity ?? '')
                              }}
                              className="text-xs font-medium text-orange-400 underline underline-offset-2 decoration-dashed"
                            >
                              {u.newQuantity}
                            </button>
                          )}
                          {u.action === 'remove' && (
                            <a
                              href={getCoupangSearchUrl(u.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-semibold text-gray-400 underline underline-offset-2 active:text-gray-600"
                            >
                              재주문
                            </a>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  <p className="text-[11px] text-gray-400 pl-1 mt-0.5">
                    체크된 재료는 저장 시 자동으로 수정됩니다
                  </p>
                </div>
              )}
            </div>

            {/* ── 사진 촬영 섹션 ── */}
            <div className="bg-gray-50 rounded-2xl px-4 py-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">📸 완성 사진으로 기록해보세요</p>
              <p className="text-xs text-gray-400">요리 기록에 사진이 표시돼요. 건너뛰어도 저장됩니다.</p>

              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="완성 사진"
                    className="w-full object-cover rounded-xl"
                    style={{ maxHeight: 220 }}
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                    aria-label="사진 제거"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => cameraRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl active:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">📷</span>
                    <span className="text-xs font-medium text-gray-700">카메라</span>
                  </button>
                  <button
                    onClick={() => galleryRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl active:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">🖼️</span>
                    <span className="text-xs font-medium text-gray-700">갤러리</span>
                  </button>
                </div>
              )}

              {/* 숨김 파일 입력 */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-white border-t border-gray-100 safe-bottom">
        {isDone ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#13AF70] text-white font-bold py-4 rounded-2xl text-[16px] active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <span>🗒️</span>
                <span>{photoFile ? '사진과 함께 기록 저장' : '기록 저장하기'}</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex gap-2">
            {currentIndex > 1 && (
              <button
                onClick={handlePrev}
                className="h-14 px-5 rounded-2xl bg-gray-100 text-[15px] font-semibold text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0"
              >
                이전
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 h-14 bg-[#13AF70] text-white font-bold rounded-2xl text-[16px] active:scale-[0.98] transition-transform"
            >
              {currentIndex === totalSteps - 1 ? '요리 완성! 🎉' : '다음 단계'}
            </button>
          </div>
        )}
      </div>

    </MobileContainer>
  )
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────

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

function StepLine({ active }: { active: boolean }) {
  return (
    <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-colors ${active ? 'bg-[#13AF70]' : 'bg-gray-200'}`} />
  )
}

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
