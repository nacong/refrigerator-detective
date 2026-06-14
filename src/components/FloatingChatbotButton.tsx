'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'

// 플로팅 버튼을 숨길 경로 (홈은 page.tsx 자체 expand 버전 사용)
const HIDDEN_PATHS = ['/', '/chatbot', '/tutorial', '/solo-cooking']

export default function FloatingChatbotButton() {
  const pathname = usePathname()
  const router = useRouter()
  const modalOpen = useAppStore((s) => s.floatingButtonHidden)

  const hidden = modalOpen || HIDDEN_PATHS.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')
  )
  if (hidden) return null

  return (
    <div
      className="fixed inset-x-0 z-[38] pointer-events-none"
      style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto w-full relative" style={{ maxWidth: 430, height: 62 }}>
        <button
          type="button"
          aria-label="냉탐이와 레시피 찾기"
          onClick={() => router.push('/chatbot')}
          className="absolute right-[14px] top-0 pointer-events-auto inline-flex items-center cursor-pointer"
          style={{
            height: 62,
            padding: 0,
            borderRadius: 9999,
            overflow: 'hidden',
            background: '#EAF7EF',
            border: '2px solid #BFE8CF',
            boxShadow: '0 8px 20px -6px rgba(19,175,112,.45), 0 0 0 4px rgba(19,175,112,.07)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/detective_salute.png"
            alt="냉탐이"
            draggable={false}
            style={{
              width: 58, height: 58,
              objectFit: 'cover', objectPosition: '50% 8%',
              transform: 'scale(1.42)', transformOrigin: '50% 6%',
            }}
          />
        </button>
      </div>
    </div>
  )
}
