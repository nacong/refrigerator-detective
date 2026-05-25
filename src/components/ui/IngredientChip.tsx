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
      className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-2 pt-2 pb-2.5 flex flex-col items-center gap-1.5 w-[88px] active:scale-95 transition-transform"
    >
      {/* D-day 뱃지 — 좌상단 */}
      <div className="w-full flex justify-start">
        <ExpiryBadge expiryDate={ingredient.expiryDate} size="sm" />
      </div>

      {/* 이모지 */}
      <span className="text-[32px] leading-none">{ingredient.emoji}</span>

      {/* 재료명 + 수량 */}
      <div className="flex items-baseline justify-center gap-1 w-full">
        <p className="text-[12px] font-bold text-gray-900 truncate">{ingredient.name}</p>
        {ingredient.quantity && (
          <span className="text-[12px] font-bold text-gray-900 flex-shrink-0">{ingredient.quantity}</span>
        )}
      </div>
    </button>
  )
}
