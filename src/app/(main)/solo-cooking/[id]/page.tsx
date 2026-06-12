'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import YouTubeSegmentPlayer from '@/components/YouTubeSegmentPlayer'
import { useSoloCookingVideos } from '@/hooks/useSoloCookingVideos'

export default function SoloCookingPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: videos = [], isLoading } = useSoloCookingVideos()
  const video = videos.find((v) => v.id === Number(id))

  const steps = video?.steps ?? []
  const totalSteps = steps.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDone, setIsDone] = useState(false)

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
      {isDone && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
      )}

      {/* 상단 오버레이: 뒤로가기 → 그 바로 아래 진행바 */}
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
                i <= currentIndex && !isDone ? 'bg-white' : i < currentIndex ? 'bg-white' : 'bg-white/30'
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
        {/* 지시어 */}
        {isDone ? (
          <div className="mb-4">
            <p className="text-[28px] font-bold text-white">요리 완성! 🎉</p>
            <p className="text-[14px] text-white/70 mt-1">훌륭해요, 완성했어요!</p>
          </div>
        ) : currentStep ? (
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-[#4ADE80] mb-1.5 tracking-wide">
              STEP {currentIndex + 1} / {totalSteps}
            </p>
            <p className="text-[20px] font-bold text-white leading-snug drop-shadow-md">
              {currentStep.description}
            </p>
          </div>
        ) : null}

        {/* 이전 / 다음 버튼 */}
        <div className="flex gap-2">
          {!isDone && (
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-14 px-5 rounded-2xl bg-white/20 backdrop-blur-md text-[15px] font-semibold text-white disabled:opacity-30 border border-white/20 active:scale-[0.97] transition-transform"
            >
              이전
            </button>
          )}
          <button
            onClick={isDone ? () => router.back() : handleNext}
            className="flex-1 h-14 rounded-2xl bg-[#13AF70] text-[16px] font-bold text-white active:scale-[0.98] transition-transform"
          >
            {isDone ? '완료' : currentIndex === totalSteps - 1 ? '요리 완성! 🎉' : '다음 단계'}
          </button>
        </div>
      </div>
    </div>
  )
}
