'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import YouTubeSegmentPlayer from '@/components/YouTubeSegmentPlayer'
import { useSoloCookingVideos } from '@/hooks/useSoloCookingVideos'
import { getCoupangSearchUrl } from '@/lib/coupang'
import type { IngredientUpdate } from '@/app/api/gemini/ingredient-update/route'

export default function SoloCookingPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: videos = [], isLoading } = useSoloCookingVideos()
  const video = videos.find((v) => v.id === Number(id))

  const steps = video?.steps ?? []
  const totalSteps = steps.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

  const startTimeRef = useRef<number>(Date.now())

  const handleNext = () => {
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setIsDone(true)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleSave = async () => {
    if (!video) return
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

      const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000))

      // 요리 기록 저장
      const saveRes = await fetch('/api/supabase/cooking-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: video.title,
          cookTime: elapsed,
          dbRecipeId: null,
          photoUrl,
          rating: rating > 0 ? rating : null,
          recipeData: {
            cookingMethod: '솔로쿠킹',
            cookTimeMinutes: video.cook_time_minutes,
            ingredientsRaw: video.ingredients.join(', '),
            steps: video.steps.map((s) => s.description),
          },
        }),
      })

      if (!saveRes.ok) {
        let errMsg = `HTTP ${saveRes.status}`
        try {
          const json = await saveRes.json()
          if (json?.error) errMsg = json.error
        } catch { /* ignore */ }
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
    if (!isDone || !video) return
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
            recipeName: video.title,
            ingredientsUsed: video.ingredients.join(', '),
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
  }, [isDone, video])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/60 text-sm">불러오는 중…</p>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-white/60">레시피를 찾을 수 없어요.</p>
        <button onClick={() => router.back()} className="text-sm text-[#13AF70] font-medium">돌아가기</button>
      </div>
    )
  }

  const currentStep = steps[currentIndex]

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      {/* 전체화면 영상 배경 */}
      {!isDone && currentStep && (
        <YouTubeSegmentPlayer
          videoId={video.youtube_video_id}
          start={currentStep.video_start ?? 0}
          end={currentStep.video_end ?? 0}
          fullscreen
          className="absolute inset-0"
        />
      )}

      {/* 완성 화면 */}
      {isDone ? (
        <>
          {/* 배경 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1a12] via-[#0d2018] to-black" />

          {/* 스크롤 가능한 완성 화면 */}
          <div
            className="absolute inset-0 overflow-y-auto"
            style={{ paddingTop: 'max(52px, calc(env(safe-area-inset-top) + 16px))' }}
          >
            {/* 상단 뒤로가기 */}
            <div className="px-4 mb-6 flex items-center">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
                aria-label="뒤로가기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* 완성 헤더 */}
            <div className="px-6 mb-6">
              <p className="text-[32px] font-bold text-white">요리 완성! 🎉</p>
              <p className="text-[15px] text-white/60 mt-1">{video.title}</p>
            </div>

            {/* 별점 섹션 */}
            <div className="mx-4 mb-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-4">
              <p className="text-sm font-semibold text-white/80 mb-3">⭐ 오늘 요리는 어땠나요?</p>
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
                      width="38" height="38" viewBox="0 0 24 24"
                      fill={(hoverRating || rating) >= star ? '#FBBF24' : 'none'}
                      stroke={(hoverRating || rating) >= star ? '#FBBF24' : 'rgba(255,255,255,0.3)'}
                      strokeWidth="1.5"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-xs text-white/50 mt-2">
                  {['', '아쉬웠어요 😢', '그저 그랬어요 😐', '괜찮았어요 🙂', '맛있었어요 😋', '최고예요! 🤩'][rating]}
                </p>
              )}
            </div>

            {/* 재료 자동 정리 섹션 */}
            <div className="mx-4 mb-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-4">
              <p className="text-sm font-semibold text-white/80 mb-3">🧹 사용한 재료 정리</p>

              {loadingIngredientUpdates ? (
                <div className="flex items-center gap-2 py-1">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-[#13AF70] rounded-full animate-spin flex-shrink-0" />
                  <span className="text-xs text-white/50">사용한 재료 분석 중...</span>
                </div>
              ) : ingredientUpdates.length === 0 ? (
                <p className="text-xs text-white/40">냉장고에 연관 재료가 없어요</p>
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
                          selected ? 'bg-white/15 border-white/20' : 'bg-white/5 border-white/10 opacity-40'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? 'bg-[#13AF70] border-[#13AF70]' : 'border-white/30'
                        }`}>
                          {selected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-base flex-shrink-0">{u.emoji}</span>
                        <span className="text-sm font-medium text-white flex-1">{u.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {u.oldQuantity && (
                            <span className="text-xs text-white/40 line-through">{u.oldQuantity}</span>
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
                              className="text-xs font-medium text-orange-400 bg-white/10 border-b border-orange-400 outline-none w-16 text-center"
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
                              className="text-[10px] font-semibold text-white/40 underline underline-offset-2 active:text-white/60"
                            >
                              재주문
                            </a>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  <p className="text-[11px] text-white/30 pl-1 mt-0.5">
                    체크된 재료는 저장 시 자동으로 수정됩니다
                  </p>
                </div>
              )}
            </div>

            {/* 사진 섹션 */}
            <div className="mx-4 mb-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-4 space-y-3">
              <p className="text-sm font-semibold text-white/80">📸 완성 사진으로 기록해보세요</p>
              <p className="text-xs text-white/40">요리 기록에 사진이 표시돼요. 건너뛰어도 저장됩니다.</p>

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
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 rounded-xl active:bg-white/20 transition-colors"
                  >
                    <span className="text-lg">📷</span>
                    <span className="text-xs font-medium text-white/80">카메라</span>
                  </button>
                  <button
                    onClick={() => galleryRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 rounded-xl active:bg-white/20 transition-colors"
                  >
                    <span className="text-lg">🖼️</span>
                    <span className="text-xs font-medium text-white/80">갤러리</span>
                  </button>
                </div>
              )}

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

            {/* 저장 버튼 */}
            <div
              className="px-4 pt-3"
              style={{ paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))' }}
            >
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
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 상단 오버레이: 뒤로가기 + 진행바 */}
          <div
            className="absolute top-0 inset-x-0 z-20 flex flex-col bg-gradient-to-b from-black/50 to-transparent pb-6"
            style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))' }}
          >
            <div className="px-4">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 active:bg-black/60"
                aria-label="뒤로가기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="flex gap-1 px-4 mt-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${
                    i <= currentIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 하단 오버레이: 지시어 + 버튼 */}
          <div
            className="absolute bottom-0 inset-x-0 z-20 px-4 bg-gradient-to-t from-black/70 to-transparent pt-12"
            style={{ paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom) + 16px))' }}
          >
            {currentStep && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#4ADE80] mb-1.5 tracking-wide">
                  STEP {currentIndex + 1} / {totalSteps}
                </p>
                <p className="text-[20px] font-bold text-white leading-snug drop-shadow-md">
                  {currentStep.description}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="h-14 px-5 rounded-2xl bg-white/20 backdrop-blur-md text-[15px] font-semibold text-white disabled:opacity-30 border border-white/20 active:scale-[0.97] transition-transform"
              >
                이전
              </button>
              <button
                onClick={handleNext}
                className="flex-1 h-14 rounded-2xl bg-[#13AF70] text-[16px] font-bold text-white active:scale-[0.98] transition-transform"
              >
                {currentIndex === totalSteps - 1 ? '요리 완성! 🎉' : '다음 단계'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
