'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
import { useCookingHistory } from '@/hooks/useCookingHistory'

const SAVINGS_PER_MEAL = 15000 // 원 (배달/외식 대비 절약 추정액)

export default function SettingsPage() {
  const { data: session } = useSession()
  const { data: history = [] } = useCookingHistory()
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

  // 이번 달 영양 (cooked_at 기준 클라이언트 로컬 월 필터)
  const now = new Date()
  const thisMonthHistory = history.filter((h) => {
    const d = new Date(h.cooked_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const mealsWithNutrition = thisMonthHistory.filter((h) => h.nutrition != null)

  let avgNutrition: { calories: number; protein: number; carbs: number; fat: number } | null = null
  if (mealsWithNutrition.length > 0) {
    const totals = mealsWithNutrition.reduce(
      (acc, h) => ({
        calories: acc.calories + (h.nutrition!.calories ?? 0),
        protein: acc.protein + (h.nutrition!.protein ?? 0),
        carbs: acc.carbs + (h.nutrition!.carbs ?? 0),
        fat: acc.fat + (h.nutrition!.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    const n = mealsWithNutrition.length
    avgNutrition = {
      calories: Math.round(totals.calories / n),
      protein: Math.round(totals.protein / n),
      carbs: Math.round(totals.carbs / n),
      fat: Math.round(totals.fat / n),
    }
  }

  // 매크로 비율 바 (단백질 파랑 / 탄수화물 주황 / 지방 빨강)
  let macroBar: { protein: number; carbs: number; fat: number } | null = null
  if (avgNutrition) {
    const macroTotal = avgNutrition.protein + avgNutrition.carbs + avgNutrition.fat
    if (macroTotal > 0) {
      macroBar = {
        protein: Math.round((avgNutrition.protein / macroTotal) * 100),
        carbs: Math.round((avgNutrition.carbs / macroTotal) * 100),
        fat: Math.round((avgNutrition.fat / macroTotal) * 100),
      }
    }
  }

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

        {/* 이번 달 평균 영양 */}
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-gray-900">이번 달 평균 영양</p>
            <span className="text-[11px] text-gray-400">
              {now.getMonth() + 1}월 · {mealsWithNutrition.length}끼니 기준
            </span>
          </div>

          {avgNutrition && macroBar ? (
            <>
              {/* 평균 칼로리 */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-extrabold text-gray-900 leading-none">
                  {avgNutrition.calories.toLocaleString()}
                </span>
                <span className="text-sm text-gray-400">kcal / 끼니</span>
              </div>

              {/* 매크로 비율 바 */}
              <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
                <div className="bg-blue-400 transition-all" style={{ width: `${macroBar.protein}%` }} />
                <div className="bg-orange-400 transition-all" style={{ width: `${macroBar.carbs}%` }} />
                <div className="bg-red-400 transition-all" style={{ width: `${macroBar.fat}%` }} />
              </div>

              {/* 매크로 레이블 */}
              <div className="flex items-center gap-3 flex-wrap">
                <MacroLabel color="bg-blue-400" label="단백질" value={avgNutrition.protein} />
                <MacroLabel color="bg-orange-400" label="탄수화물" value={avgNutrition.carbs} />
                <MacroLabel color="bg-red-400" label="지방" value={avgNutrition.fat} />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 py-1">
              요리를 완료하면 영양 정보가 쌓여요 🥗
            </p>
          )}
        </div>

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

// ── 서브 컴포넌트 ──────────────────────────────────────────────
function MacroLabel({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
      <span className="text-[12px] text-gray-600">
        {label} <span className="font-semibold">{value}g</span>
      </span>
    </div>
  )
}
