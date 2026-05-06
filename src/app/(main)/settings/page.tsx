'use client'

import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <MobileContainer>
      <div className="safe-top" />

      <header className="px-4 pt-2 pb-3 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-base font-bold text-gray-800">설정</h1>
      </header>

      <div className="flex-1 px-4 py-6">
        {session?.user && (
          <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
            <p className="text-xs text-gray-400 mb-1">로그인 계정</p>
            <p className="text-sm font-medium text-gray-800">{session.user.email}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-4 bg-white border border-gray-200 rounded-2xl active:bg-gray-50"
        >
          <span className="text-sm font-medium text-red-500">로그아웃</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="safe-bottom" />
    </MobileContainer>
  )
}
