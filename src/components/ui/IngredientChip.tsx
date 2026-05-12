import ExpiryBadge from './ExpiryBadge'
import type { Ingredient } from '@/types'

interface IngredientChipProps {
  ingredient: Ingredient
  onClick?: () => void
}

export default function IngredientChip({ ingredient, onClick }: IngredientChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-2xl w-[120px] active:scale-95 transition-transform"
      style={{ padding: '18px 12px 14px' }}
    >
      <span className="text-[34px] leading-none">{ingredient.emoji}</span>
      <span className="text-[13px] font-medium text-gray-700 truncate w-full text-center mt-0.5">
        {ingredient.name}
      </span>
      <ExpiryBadge expiryDate={ingredient.expiryDate} size="sm" />
    </button>
  )
}
