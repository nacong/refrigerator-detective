import type { IngredientCategory } from '@/types'

export const CATEGORY_ORDER: IngredientCategory[] = [
  '채소/버섯', '과일', '육류/해산물', '달걀/유제품', '두부/콩류',
  '밥/면/빵', '김치/반찬', '가공식품', '양념/소스', '기타',
]

export const CATEGORY_META: Record<IngredientCategory, { icon: string }> = {
  '채소/버섯':   { icon: '🥬' },
  '과일':        { icon: '🍎' },
  '육류/해산물': { icon: '🥩' },
  '달걀/유제품': { icon: '🥚' },
  '두부/콩류':   { icon: '🫘' },
  '밥/면/빵':    { icon: '🍚' },
  '김치/반찬':   { icon: '🍱' },
  '가공식품':    { icon: '🧆' },
  '양념/소스':   { icon: '🫙' },
  '기타':        { icon: '📦' },
}
