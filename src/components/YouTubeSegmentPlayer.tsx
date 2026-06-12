'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiReady = false
const queue: (() => void)[] = []
function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (apiReady) { resolve(); return }
    queue.push(resolve)
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true
      queue.forEach((cb) => cb())
      queue.length = 0
    }
  })
}

interface Props {
  videoId: string
  start: number
  end: number
  className?: string
  fullscreen?: boolean
}

export default function YouTubeSegmentPlayer({ videoId, start, end, className = '', fullscreen = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null)
  const startRef = useRef(start)
  const endRef = useRef(end)
  const loopCountRef = useRef(0)
  const [progress, setProgress] = useState(0) // 0–1, 구간 기준
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { startRef.current = start; endRef.current = end }, [start, end])

  const startPolling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const player = playerRef.current
      if (!player?.getCurrentTime) return
      const cur = player.getCurrentTime() as number
      const s = startRef.current
      const e = endRef.current
      const duration = e - s
      if (duration <= 0) return
      setProgress(Math.min(1, Math.max(0, (cur - s) / duration)))
    }, 250)
  }, [])

  // 플레이어 생성
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let dead = false

    const mountDiv = document.createElement('div')
    wrap.appendChild(mountDiv)

    loadYTApi().then(() => {
      if (dead) return
      playerRef.current = new window.YT.Player(mountDiv, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          start, end,
          autoplay: 1,
          mute: fullscreen ? 0 : 1,
          controls: fullscreen ? 0 : 1,
          disablekb: fullscreen ? 1 : 0,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (e: any) => {
            if (fullscreen) {
              e.target.unMute()
              e.target.setVolume(100)
            }
            startPolling()
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (e: any) => {
            if (e.data === window.YT?.PlayerState?.ENDED) {
              loopCountRef.current += 1
              if (loopCountRef.current === 1) {
                playerRef.current?.mute()
              }
              playerRef.current?.seekTo(startRef.current, true)
              playerRef.current?.playVideo()
            }
          },
        },
      })
    })

    return () => {
      dead = true
      if (timerRef.current) clearInterval(timerRef.current)
      playerRef.current?.destroy?.()
      playerRef.current = null
      wrap.innerHTML = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // 단계 변경 시 새 구간으로 이동 + 루프 카운터 초기화
  useEffect(() => {
    if (!playerRef.current?.loadVideoById) return
    loopCountRef.current = 0
    if (fullscreen) playerRef.current.unMute?.()
    playerRef.current.loadVideoById({ videoId, startSeconds: start, endSeconds: end })
    setProgress(0)
  }, [videoId, start, end, fullscreen])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const bar = (e.currentTarget as HTMLDivElement)
    const rect = bar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const seekTo = startRef.current + ratio * (endRef.current - startRef.current)
    playerRef.current?.seekTo(seekTo, true)
    setProgress(ratio)
  }, [])

  const segmentSec = end - start
  const currentSec = Math.round(progress * segmentSec)
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className={className}>
      {/* 영상 영역 */}
      <div
        ref={wrapRef}
        className={fullscreen
          ? 'absolute inset-0 w-full h-full overflow-hidden bg-black'
          : 'w-full aspect-[9/16] overflow-hidden bg-black'
        }
      />
      {/* 유튜브 상단 제목 가리기 */}
      {fullscreen && (
        <div className="absolute top-0 inset-x-0 h-16 bg-black z-10 pointer-events-none" />
      )}

      {/* 프로그레스 바 — fullscreen 시 숨김 */}
      {!fullscreen && (
        <div className="px-4 pt-2 pb-1">
          <div
            className="relative h-[18px] flex items-center cursor-pointer"
            onClick={handleSeek}
            onTouchMove={handleSeek}
          >
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#13AF70] rounded-full transition-none"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-[#13AF70] shadow -translate-x-1/2"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{fmt(currentSec)}</span>
            <span>{fmt(segmentSec)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
