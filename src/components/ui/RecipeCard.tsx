import type { Recipe } from '@/types'

interface RecipeCardProps {
  recipe: Recipe
  variant?: 'horizontal' | 'vertical'
  onClick?: () => void
}

export default function RecipeCard({ recipe, variant = 'horizontal', onClick }: RecipeCardProps) {
  const cookNum = recipe.cookTime > 0
    ? (recipe.cookTime < 60 ? String(recipe.cookTime) : `${Math.floor(recipe.cookTime / 60)}시간${recipe.cookTime % 60 > 0 ? ` ${recipe.cookTime % 60}` : ''}`)
    : '0'
  const cookUnit = recipe.cookTime > 0 && recipe.cookTime >= 60 ? '' : '분'
  const costNum = recipe.costPerServing > 0 ? recipe.costPerServing.toLocaleString() : '0'

  if (variant === 'vertical') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center bg-white border border-gray-200 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform text-left"
      >
        {/* 썸네일 */}
        <div className="w-[108px] h-[108px] flex-shrink-0 bg-gradient-to-br from-green-100 to-yellow-100 flex items-center justify-center text-[54px]">
          {recipe.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.thumbnailUrl} alt={recipe.name} className="w-full h-full object-cover" />
          ) : '🍳'}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0 flex flex-col gap-[5px] py-3 pr-3.5 pl-3.5">
          <p className="text-[15px] font-bold text-gray-800 tracking-tight truncate">{recipe.name}</p>
          <div className="flex items-baseline gap-[10px]">
            <span className="flex items-baseline gap-[3px] text-sm font-bold text-gray-900 tracking-tight">
              {cookNum}<span className="text-[10px] font-medium text-gray-400">{cookUnit || '분'}</span>
            </span>
            <span className="flex items-baseline gap-[3px] text-sm font-bold text-gray-900 tracking-tight">
              {costNum}<span className="text-[10px] font-medium text-gray-400">원</span>
            </span>
          </div>
        </div>
      </button>
    )
  }

  // 메인 페이지 가로 스크롤용 horizontal
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden w-[200px] active:scale-[0.98] transition-transform text-left"
    >
      {/* 썸네일 */}
      <div className="relative w-full h-[148px] bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center text-[72px]">
        {recipe.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.thumbnailUrl} alt={recipe.name} className="w-full h-full object-cover" />
        ) : '🍳'}
        {recipe.ingredients.length > 0 && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-[#13AF70] text-white text-[10.5px] font-semibold px-2 py-0.5 rounded-full z-10">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            재료 {recipe.ingredients.length}개
          </span>
        )}
      </div>

      {/* 정보 */}
      <div className="px-3 pt-3 pb-3.5">
        <p className="text-sm font-bold text-gray-800 truncate tracking-tight">{recipe.name}</p>
        <div className="flex items-baseline gap-[10px] mt-2">
          <span className="flex items-baseline gap-[3px] text-sm font-bold text-gray-900 tracking-tight">
            {cookNum}<span className="text-[10px] font-medium text-gray-400">{cookUnit || '분'}</span>
          </span>
          <span className="flex items-baseline gap-[3px] text-sm font-bold text-gray-900 tracking-tight">
            {costNum}<span className="text-[10px] font-medium text-gray-400">원</span>
          </span>
        </div>
      </div>
    </button>
  )
}
