'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
import { useCookingHistory } from '@/hooks/useCookingHistory'

const SAVINGS_PER_MEAL = 15000 // 원 (배달/외식 대비 절약 추정액)

// 냉털 뱃지 레벨
const BADGE_LEVELS = [
  { min: 0,  max: 0,  emoji: '🥶', title: '냉털 전무',   desc: '아직 냉털을 시작하지 않았어요',   color: 'text-gray-400', bg: 'bg-gray-50' },
  { min: 1,  max: 4,  emoji: '🌱', title: '냉털 새싹',   desc: '냉털을 시작했어요! 계속해봐요',    color: 'text-green-500', bg: 'bg-green-50' },
  { min: 5,  max: 9,  emoji: '🥕', title: '냉털 초보',   desc: '이제 냉장고를 관리할 줄 알아요!', color: 'text-orange-500', bg: 'bg-orange-50' },
  { min: 10, max: 19, emoji: '⭐', title: '냉털 달인',   desc: '음식 낭비 없이 척척 해내는 중!',  color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { min: 20, max: 49, emoji: '🏆', title: '냉털 전문가', desc: '냉장고 관리의 달인이에요!',        color: 'text-blue-500',  bg: 'bg-blue-50' },
  { min: 50, max: Infinity, emoji: '👑', title: '냉털 마스터', desc: '전설의 냉장고 탐정!',       color: 'text-purple-500', bg: 'bg-purple-50' },
]

function getBadge(count: number) {
  return BADGE_LEVELS.find((b) => count >= b.min && count <= b.max) ?? BADGE_LEVELS[0]
}

function getNextMilestone(count: number): number | null {
  const milestones = [1, 5, 10, 20, 50]
  return milestones.find((m) => m > count) ?? null
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { data: history = [] } = useCookingHistory()
  const { data: userStats } = useQuery<{ cleared_count: number }>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const res = await fetch('/api/supabase/user-stats')
      if (!res.ok) return { cleared_count: 0 }
      return res.json()
    },
  })
  const clearedCount = userStats?.cleared_count ?? 0
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── 통계 계산 ────────────────────────────────────────────────
  const totalMeals = history.length
  const totalSavings = totalMeals * SAVINGS_PER_MEAL

  const ratingsWithValues = history.filter((h) => h.rating != null && h.rating > 0)
  const avgRating =
    ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, h) => sum + h.rating!, 0) / ratingsWithValues.length
      : null

  // ── 계정 액션 ────────────────────────────────────────────────
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
      if (session?.user?.email) {
        localStorage.removeItem(`visited_${session.user.email}`)
      }
      await signOut({ callbackUrl: '/login' })
    } catch {
      alert('탈퇴 처리 중 오류가 발생했습니다.')
      setIsDeleting(false)
    }
  }

  const email = session?.user?.email ?? ''
  const avatarLetter = email.charAt(0).toUpperCase()

  return (
    <MobileContainer fullHeight>
      {/* 헤더 */}
      <header
        className="px-4 pb-3 border-b border-gray-100"
        style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}
      >
        <h1 className="text-[22px] font-bold text-gray-900">마이페이지</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 flex flex-col gap-4 no-scrollbar">

        {/* 프로필 */}
        {session?.user && (
          <div className="flex items-center gap-3 px-1">
            <div className="w-12 h-12 rounded-full bg-[#13AF70] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[20px] font-bold">{avatarLetter}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">로그인 계정</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{email}</p>
            </div>
          </div>
        )}

        {/* 통계 카드 3개 */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-gray-50 rounded-2xl px-3 py-3.5 flex flex-col items-center gap-1">
            <span className="text-[24px] font-extrabold text-gray-900 leading-none">{totalMeals}</span>
            <span className="text-[11px] text-gray-400 text-center leading-tight mt-1">총 요리<br />횟수</span>
          </div>
          <div className="bg-[#F0FBF5] rounded-2xl px-2 py-3.5 flex flex-col items-center gap-1">
            <span className="text-[18px] font-extrabold text-[#13AF70] leading-none">
              {totalSavings >= 10000
                ? `${Math.floor(totalSavings / 10000)}만`
                : totalSavings.toLocaleString()}
            </span>
            <span className="text-[11px] text-gray-500 text-center leading-tight mt-1">절약 금액<br />(원)</span>
          </div>
          <div className="bg-gray-50 rounded-2xl px-3 py-3.5 flex flex-col items-center gap-1">
            {avgRating != null ? (
              <>
                <span className="text-[20px] font-extrabold text-gray-900 leading-none">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-[13px] leading-none">⭐</span>
              </>
            ) : (
              <span className="text-[24px] font-extrabold text-gray-300 leading-none">—</span>
            )}
            <span className="text-[11px] text-gray-400 text-center leading-tight mt-1">평균<br />별점</span>
          </div>
        </div>

        {/* 냉털 게이미피케이션 카드 */}
        {(() => {
          const badge = getBadge(clearedCount)
          const next = getNextMilestone(clearedCount)
          const progress = next
            ? Math.round((clearedCount / next) * 100)
            : 100

          return (
            <div className={`rounded-2xl px-4 py-4 flex flex-col gap-3 ${badge.bg}`}>
              {/* 상단: 뱃지 + 카운트 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[28px] leading-none">{badge.emoji}</span>
                  <div>
                    <p className={`text-[14px] font-extrabold ${badge.color}`}>{badge.title}</p>
                    <p className="text-[11px] text-gray-400">{badge.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[28px] font-extrabold text-gray-800 leading-none">{clearedCount}</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">냉털 횟수</p>
                </div>
              </div>

              {/* 다음 마일스톤 프로그레스 */}
              {next ? (
                <>
                  <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#13AF70] rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 text-center">
                    다음 목표까지 <span className="font-bold text-gray-700">{next - clearedCount}개</span> 남았어요 →  {getBadge(next).emoji} {getBadge(next).title}
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-center font-semibold text-purple-500">
                  🎉 최고 등급 달성! 전설의 냉장고 탐정이에요!
                </p>
              )}
            </div>
          )
        })()}

        {/* 계정 설정 */}
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-semibold text-gray-400 px-1">계정 설정</p>
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
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2" fill="#9CA3AF" />
            </svg>
          </button>
        </div>

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

