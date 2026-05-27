// 앱 전체에서 사용하는 타입 정의

export interface Ingredient {
  id: string
  name: string
  emoji: string
  quantity: string
  expiryDate: string // ISO 날짜 문자열 (YYYY-MM-DD)
  userId?: string
  imageUrl?: string
}

export interface Recipe {
  id: string
  name: string
  cookTime: number // 분 단위
  costPerServing: number // 원화
  thumbnailUrl?: string
  ingredients: string[]
  description?: string
  createdAt?: string
}

export interface ChatRecipe {
  name: string
  cookingMethod: string
  cookTimeMinutes: number
  ingredientsRaw: string
  imageUrl: string
  sourceUrl: string
  steps?: string[]
  dbRecipeId?: number   // db_recipes.id 참조 (AI 생성 또는 히스토리 재생 시)
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  recipes?: Recipe[]
  chatRecipes?: ChatRecipe[]
  selectedIngredients?: string[] // 유저 메시지에 첨부된 선택 재료
  createdAt: string
}

// D-day 배지 타입
export type ExpiryStatus = 'urgent' | 'caution' | 'safe'

// AI 인식 단계
export type AIStep = 1 | 2 | 3
