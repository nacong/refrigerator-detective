'use client'

import { signIn } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'

// 화면 1: 로그인 페이지
export default function LoginPage() {
  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/' })
  }

  return (
    <MobileContainer>
      {/* 상단 안전 영역 */}
      <div className="safe-top" />

      {/* 콘텐츠 영역 - 세로 중앙 정렬 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        {/* 캐릭터 아이콘 및 앱 이름 */}
        <div className="flex flex-col items-center mb-8">
          {/* 탐정 캐릭터 이미지 공간 */}
          <div className="w-24 h-24 rounded-full bg-[#E8F9F1] flex items-center justify-center mb-4">
            <span className="text-5xl">🔍</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">냉장고 탐정</h1>
          <p className="text-sm text-gray-400 font-medium tracking-wider">REFRIGERATOR DETECTIVE</p>
        </div>

        {/* 슬로건 */}
        <div className="text-center mb-12">
          <p className="text-base text-gray-500 leading-relaxed">
            냉장고 속 재료로<br />
            오늘의 레시피를 찾아드려요!
          </p>
        </div>
      </div>

      {/* 하단 로그인 영역 */}
      <div className="px-6 pb-10 safe-bottom">
        {/* 구분선 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">간편 로그인</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* 구글 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-4 shadow-sm active:scale-[0.98] transition-transform"
        >
          {/* Google 로고 SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-700">Google로 계속하기</span>
        </button>
      </div>
    </MobileContainer>
  )
}
