'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import ProgressBar from '@/components/ui/ProgressBar'

export default function TutorialStep3Page() {
  const router = useRouter()

  return (
    <MobileContainer>
      <header className="safe-top pt-4 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pb-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            aria-label="뒤로가기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-gray-800">냉장고 탐정 시작하기</h1>
        </div>
        <ProgressBar currentStep={3} totalSteps={3} />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-28 h-28 rounded-full bg-[#E8F9F1] flex items-center justify-center">
            <span className="text-6xl">🍳</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">레시피 추천</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              등록된 재료를 바탕으로<br />
              <span className="text-[#13AF70] font-medium">냉탐이</span>가 맞춤 레시피를 추천해 드려요
            </p>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-4 bg-[#E8F9F1] rounded-2xl px-4 py-3.5">
            <span className="text-2xl">🕵️</span>
            <div>
              <p className="text-sm font-semibold text-[#13AF70]">AI 레시피 탐정</p>
              <p className="text-xs text-gray-500">있는 재료로 뚝딱 만드는 요리를 찾아요</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3.5">
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">빠른 레시피</p>
              <p className="text-xs text-gray-400">식재료 인식 직후 바로 추천받아요</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3.5">
            <span className="text-2xl">📝</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">요리 기록</p>
              <p className="text-xs text-gray-400">만든 요리를 기록하고 다시 볼 수 있어요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-3 safe-bottom">
        <button
          onClick={() => router.push('/ai-recognition/step1')}
          className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>📸</span>
          <span>냉장고 사진 찍고 시작하기</span>
        </button>
      </div>
    </MobileContainer>
  )
}
