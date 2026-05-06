'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useAppStore } from '@/store/useAppStore'

export default function RecipeDetailPage() {
  const router = useRouter()
  const recipe = useAppStore((s) => s.selectedRecipe)

  if (!recipe) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl">🍳</span>
          <p className="text-sm text-gray-400">레시피를 찾을 수 없어요.</p>
          <button onClick={() => router.back()} className="text-sm text-[#13AF70] font-medium">
            ← 돌아가기
          </button>
        </div>
      </MobileContainer>
    )
  }

  const ingredients = recipe.ingredientsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <MobileContainer>
      {/* 헤더 */}
      <header className="safe-top pt-4 pb-3 px-4 flex items-center gap-3 border-b border-gray-100">
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
        <h1 className="text-sm font-bold text-gray-800 truncate">{recipe.name}</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* 대표 이미지 */}
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-56 object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-6xl">🍳</div>
        )}

        <div className="px-4 py-5 space-y-5">
          {/* 레시피 이름 */}
          <h2 className="text-xl font-bold text-gray-900">{recipe.name}</h2>

          {/* 메타 정보 */}
          <div className="flex gap-3">
            {recipe.cookingMethod && (
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                🍳 {recipe.cookingMethod}
              </span>
            )}
            {recipe.cookTimeMinutes > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                ⏱ {recipe.cookTimeMinutes}분
              </span>
            )}
          </div>

          {/* 재료 */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">재료</h3>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing) => (
                <span
                  key={ing}
                  className="text-xs text-gray-700 bg-[#E8F9F1] px-3 py-1.5 rounded-full"
                >
                  {ing}
                </span>
              ))}
            </div>
          </section>

          {/* 원본 레시피 링크 */}
          {recipe.sourceUrl && (
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-2">조리 순서</h3>
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 active:bg-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">원본 레시피 보기</p>
                  <p className="text-xs text-gray-400 mt-0.5">만개의레시피에서 자세한 조리법 확인</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </section>
          )}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 safe-bottom">
        <button
          onClick={() => router.push('/cooking-process')}
          className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>🍳</span>
          <span>요리 시작하기</span>
        </button>
      </div>
    </MobileContainer>
  )
}
