'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import ProgressBar from '@/components/ui/ProgressBar'

export default function TutorialStep1Page() {
  const router = useRouter()

  return (
    <MobileContainer>
      <header className="safe-top pt-4 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pb-3">
          <h1 className="text-sm font-bold text-gray-800">냉장고 탐정 시작하기</h1>
        </div>
        <ProgressBar currentStep={1} totalSteps={3} />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-28 h-28 rounded-full bg-[#E8F9F1] flex items-center justify-center">
            <span className="text-[56px]">🕵️</span>
          </div>
          <div className="text-center">
            <h2 className="text-[22px] font-bold text-gray-800 mb-2">냉장고 탐정</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI가 냉장고 속 재료를 인식하고<br />
              유통기한을 관리해 드려요
            </p>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3.5">
            <span className="text-2xl">📸</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">AI 식재료 인식</p>
              <p className="text-xs text-gray-400">사진 한 장으로 재료를 등록해요</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3.5">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">유통기한 구조대</p>
              <p className="text-xs text-gray-400">곧 만료되는 식재료를 알려드려요</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3.5">
            <span className="text-2xl">🍳</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">레시피 추천</p>
              <p className="text-xs text-gray-400">있는 재료로 만들 수 있는 요리를 찾아요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-3 safe-bottom">
        <button
          onClick={() => router.push('/tutorial/step2')}
          className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform"
        >
          다음
        </button>
      </div>
    </MobileContainer>
  )
}
