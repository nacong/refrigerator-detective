'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import ProgressBar from '@/components/ui/ProgressBar'

export default function TutorialStep2Page() {
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
        <ProgressBar currentStep={2} totalSteps={3} />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-28 h-28 rounded-full bg-[#E8F9F1] flex items-center justify-center">
            <span className="text-[56px]">📸</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">AI 식재료 인식</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              냉장고 사진을 찍으면<br />
              <span className="text-[#13AF70] font-medium">냉탐이</span>가 식재료를 자동으로 인식해요
            </p>
          </div>
        </div>

        <div className="w-full bg-gray-50 rounded-3xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#13AF70] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">사진 촬영</p>
              <p className="text-xs text-gray-400 mt-0.5">냉장고 안을 카메라로 찍어주세요</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#13AF70] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">AI 자동 인식</p>
              <p className="text-xs text-gray-400 mt-0.5">식재료 이름, 수량을 자동으로 찾아요</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#13AF70] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">유통기한 입력 후 저장</p>
              <p className="text-xs text-gray-400 mt-0.5">날짜를 입력하면 구조대가 관리해 드려요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-3 safe-bottom">
        <button
          onClick={() => router.push('/tutorial/step3')}
          className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform"
        >
          다음
        </button>
      </div>
    </MobileContainer>
  )
}
