'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useCookingHistory, type CookingHistoryItem } from '@/hooks/useCookingHistory'
import { useAppStore } from '@/store/useAppStore'

export default function CookingHistoryPage() {
  const router = useRouter()
  const { data: history = [], isLoading } = useCookingHistory()
  const setSelectedRecipe = useAppStore((s) => s.setSelectedRecipe)

  const handleCardClick = (item: CookingHistoryItem) => {
    setSelectedRecipe({
      name: item.recipe_name,
      cookingMethod: '',
      cookTimeMinutes: item.cook_time,
      ingredientsRaw: item.ingredients.join(', '),
      imageUrl: item.thumbnail_url,
      sourceUrl: '',
      steps: item.steps,
    })
    router.push('/cooking-process')
  }

  return (
    <MobileContainer>
      <header className="flex items-center gap-3 px-4 safe-top pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-gray-800">요리 기록</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[160px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">🍳</span>
            <p className="text-sm text-gray-400">아직 요리 기록이 없어요</p>
            <button
              onClick={() => router.push('/chatbot')}
              className="text-sm text-[#13AF70] font-medium"
            >
              냉탐이에게 레시피 추천받기 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 text-left active:scale-95 transition-transform"
              >
                {/* 이미지 영역 */}
                <div className="w-full h-[96px] bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center overflow-hidden">
                  {item.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail_url}
                      alt={item.recipe_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[48px] leading-none">🍳</span>
                  )}
                </div>

                {/* 텍스트 영역 */}
                <div className="px-3 pt-2.5 pb-3">
                  <p className="text-[13px] font-bold text-gray-800 truncate">{item.recipe_name}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    {item.cook_time > 0 && (
                      <span className="flex items-baseline gap-[3px]">
                        <span className="text-[15px] font-bold text-gray-900">{item.cook_time}</span>
                        <span className="text-[11px] text-gray-400">분</span>
                      </span>
                    )}
                    {item.cost_per_serving >= 0 && (
                      <span className="flex items-baseline gap-[3px]">
                        <span className="text-[15px] font-bold text-gray-900">{item.cost_per_serving.toLocaleString()}</span>
                        <span className="text-[11px] text-gray-400">원</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(item.cooked_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="safe-bottom" />
    </MobileContainer>
  )
}
