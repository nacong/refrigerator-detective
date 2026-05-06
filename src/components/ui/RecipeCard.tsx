import { formatKRW, formatCookTime } from '@/lib/utils'
import type { Recipe } from '@/types'

interface RecipeCardProps {
  recipe: Recipe
  variant?: 'horizontal' | 'vertical'
  onClick?: () => void
}

// 레시피 카드 컴포넌트 (가로/세로 두 가지 레이아웃)
export default function RecipeCard({ recipe, variant = 'horizontal', onClick }: RecipeCardProps) {
  if (variant === 'vertical') {
    // 요리 기록 상세 페이지용 세로 레이아웃
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm active:scale-[0.98] transition-transform text-left"
      >
        {/* 썸네일 영역 */}
        <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
          {recipe.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.thumbnailUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🍳</div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{recipe.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            ⏱ {formatCookTime(recipe.cookTime)}
          </p>
          <p className="text-sm text-gray-500">
            {formatKRW(recipe.costPerServing)}/인분
          </p>
          {recipe.ingredients.length > 0 && (
            <p className="text-xs text-[#13AF70] mt-1 truncate">
              {recipe.ingredients.slice(0, 3).map((i) => `#${i}`).join(' ')}
            </p>
          )}
        </div>
      </button>
    )
  }

  // 메인 페이지 가로 스크롤용 레이아웃
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden w-[140px] shadow-sm active:scale-95 transition-transform text-left"
    >
      {/* 썸네일 */}
      <div className="w-full h-[90px] bg-gray-100 flex items-center justify-center text-3xl">
        {recipe.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.thumbnailUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          '🍳'
        )}
      </div>

      {/* 정보 */}
      <div className="p-2">
        <p className="text-sm font-semibold text-gray-800 truncate">{recipe.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">⏱ {formatCookTime(recipe.cookTime)}</p>
        <p className="text-xs text-gray-500">{formatKRW(recipe.costPerServing)}</p>
      </div>
    </button>
  )
}
