// 앱 전체에서 사용하는 타입 정의

export interface Ingredient {
  id: string
  name: string
  emoji: string
  quantity: string
  expiryDate: string // ISO 날짜 문자열 (YYYY-MM-DD)
  price?: number
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
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  recipes?: Recipe[]
  chatRecipes?: ChatRecipe[]
  createdAt: string
}

// D-day 배지 타입
export type ExpiryStatus = 'urgent' | 'caution' | 'safe'

// AI 인식 단계
export type AIStep = 1 | 2 | 3
