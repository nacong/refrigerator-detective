import { GoogleGenAI } from '@google/genai'
import type { Ingredient } from '@/types'

export async function recognizeIngredients(imageBase64: string, mimeType: string): Promise<Partial<Ingredient>[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const prompt = `이 냉장고 사진에서 보이는 식재료들을 인식해주세요.
각 식재료에 대해 다음 형식의 JSON 배열로 응답해주세요:
[
  {
    "name": "식재료 이름 (한국어)",
    "emoji": "적절한 이모지",
    "quantity": "추정 수량 또는 용량 (예: 6개, 200ml, 300g)",
    "location": "보관 위치 — 냉장실 | 냉동실 | 실온 중 하나",
    "category": "카테고리 — 채소/버섯 | 과일 | 육류/해산물 | 달걀/유제품 | 두부/콩류 | 밥/면/빵 | 김치/반찬 | 가공식품 | 양념/소스 | 기타 중 하나"
  }
]
location은 사진 속 위치(냉장실 칸/냉동실 칸 등)나 식재료 특성으로 판단하고,
category는 식재료 종류로 판단하세요.
JSON만 반환하고 다른 텍스트는 포함하지 마세요.`

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType } },
        ],
      },
    ],
    config: {
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  const text = response.text ?? ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const ingredients = JSON.parse(jsonMatch[0]) as Partial<Ingredient>[]
  const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return ingredients.map((item, index) => ({
    ...item,
    id: `temp-${index}`,
    expiryDate: oneWeekLater,
  }))
}
