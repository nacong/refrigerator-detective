import ExpiryBadge from './ExpiryBadge'
import type { Ingredient } from '@/types'

interface IngredientChipProps {
  ingredient: Ingredient
  onClick?: () => void
}

// 식재료 칩 컴포넌트 (메인 페이지 가로 스크롤용)
export default function IngredientChip({ ingredient, onClick }: IngredientChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-1 bg-white border border-gray-200 rounded-2xl p-3 w-[90px] shadow-sm active:scale-95 transition-transform"
    >
      <span className="text-2xl">{ingredient.emoji}</span>
      <span className="text-xs font-medium text-gray-700 truncate w-full text-center">
        {ingredient.name}
      </span>
      <ExpiryBadge expiryDate={ingredient.expiryDate} size="sm" />
    </button>
  )
}
