'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSoloCookingVideos } from '@/hooks/useSoloCookingVideos'
import type { SoloCookingVideo } from '@/app/api/supabase/solo-cooking-videos/route'

function thumbUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

export default function SoloCookingSection({ searchQuery = '' }: { searchQuery?: string }) {
  const router = useRouter()
  const { data: videos = [], isLoading } = useSoloCookingVideos()
  const [preview, setPreview] = useState<SoloCookingVideo | null>(null)

  const filtered = searchQuery.trim()
    ? videos.filter((v) =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : videos

  return (
    <>
      <section className="mb-5 pt-3">
        <div className="grid grid-cols-2 gap-3 px-4">
          {isLoading && [1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[9/16] rounded-2xl bg-gray-200 animate-pulse" />
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="col-span-2 py-16 flex flex-col items-center gap-2">
              <p className="text-gray-400 text-sm">검색 결과가 없어요</p>
            </div>
          )}
          {!isLoading && filtered.map((video) => (
            <button
              key={video.id}
              onClick={() => setPreview(video)}
              className="aspect-[9/16] rounded-2xl overflow-hidden relative active:scale-[0.97] transition-transform w-full bg-gray-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(video.youtube_video_id)}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
                }}
              />
              {/* 하단 그라데이션 + 제목 */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3 pb-3 pt-10">
                <p className="text-white text-[17px] font-bold line-clamp-2 leading-snug">
                  {video.title}
                </p>
              </div>
              {/* 플레이 버튼 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                    <path d="M1 1l10 6L1 13V1z" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 미리보기 팝업 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex flex-col px-8 w-full"
            style={{ maxWidth: '360px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 제목 */}
            <div className="mb-3">
              <p className="text-[11px] text-white/60">{preview.channel_name}</p>
              <h3 className="text-[20px] font-bold text-white mt-0.5 line-clamp-1">{preview.title}</h3>
            </div>

            {/* 9:16 영상 */}
            <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden">
              <iframe
                key={preview.id}
                src={`https://www.youtube.com/embed/${preview.youtube_video_id}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={preview.title}
              />
            </div>

            {/* 시작하기 버튼 */}
            <button
              className="w-full h-14 mt-4 rounded-2xl bg-[#13AF70] text-[17px] font-bold text-white active:scale-[0.98] transition-transform"
              onClick={() => {
                setPreview(null)
                router.push(`/solo-cooking/${preview.id}`)
              }}
            >
              시작하기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
