'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
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
      dbRecipeId: item.db_recipe_id ?? undefined,
    })
    router.push('/cooking-process')
  }

  return (
    <MobileContainer fullHeight>
      <header className="px-4 pb-3 border-b border-gray-100" style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}>
        <h1 className="text-[22px] font-bold text-gray-900">요리 기록</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 no-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[160px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/detective_thinking.png" alt="탐정" className="w-48 h-48 object-contain" />
            <p className="text-lg font-bold text-gray-800">아직 요리 기록이 없어요</p>
            <button
              onClick={() => router.push('/chatbot')}
              className="text-sm text-[#13AF70] font-medium"
            >
              냉탐이에게 레시피 추천받기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 text-left active:scale-95 transition-transform"
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
                  <p className="text-[13px] font-bold text-gray-800 truncate">{item.recipe_name || '알 수 없는 레시피'}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    {item.cook_time > 0 ? (
                      <span className="flex items-baseline gap-[3px]">
                        <span className="text-[13px] font-semibold text-gray-700">{item.cook_time}</span>
                        <span className="text-[11px] text-gray-400">분</span>
                      </span>
                    ) : <span />}
                    <span className="text-[11px] text-gray-400">
                      {new Date(item.cooked_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation active="recipe" />
    </MobileContainer>
  )
}
