'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/supabase/user', { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json()
        alert(error || '탈퇴 처리 중 오류가 발생했습니다.')
        setIsDeleting(false)
        return
      }
      await signOut({ callbackUrl: '/login' })
    } catch {
      alert('탈퇴 처리 중 오류가 발생했습니다.')
      setIsDeleting(false)
    }
  }

  return (
    <MobileContainer fullHeight>
      <header className="px-4 pb-3 border-b border-gray-100" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900">마이페이지</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 flex flex-col gap-3 no-scrollbar">
        {session?.user && (
          <div className="mb-3 p-4 bg-gray-50 rounded-2xl">
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

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-between px-4 py-4 bg-white border border-gray-200 rounded-2xl active:bg-gray-50"
        >
          <span className="text-sm font-medium text-gray-400">회원 탈퇴</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 17l5-5-5-5M21 12H9"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2" fill="#9CA3AF" />
          </svg>
        </button>
      </div>

      <BottomNavigation active="mypage" />

      {/* 탈퇴 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">정말 탈퇴하시겠어요?</h2>
            <p className="text-sm text-gray-500 mb-6">
              탈퇴하면 냉장고 재료, 요리 기록 등 모든 데이터가 영구적으로 삭제되며 복구할 수 없어요.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full py-4 bg-red-500 text-white text-sm font-semibold rounded-2xl active:bg-red-600 disabled:opacity-60"
              >
                {isDeleting ? '탈퇴 처리 중...' : '탈퇴하기'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full py-4 bg-gray-100 text-gray-700 text-sm font-semibold rounded-2xl active:bg-gray-200 disabled:opacity-60"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
