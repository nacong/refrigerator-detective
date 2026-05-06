import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Ingredient } from '@/types'

// 이미지에서 식재료를 인식하는 함수 (런타임에만 클라이언트 생성)
export async function recognizeIngredients(imageBase64: string, mimeType: string): Promise<Partial<Ingredient>[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  const prompt = `이 냉장고 사진에서 보이는 식재료들을 인식해주세요.
각 식재료에 대해 다음 형식의 JSON 배열로 응답해주세요:
[
  {
    "name": "식재료 이름 (한국어)",
    "emoji": "적절한 이모지",
    "quantity": "추정 수량 또는 용량 (예: 6개, 200ml, 300g)"
  }
]
JSON만 반환하고 다른 텍스트는 포함하지 마세요.`

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType,
    },
  }

  const result = await model.generateContent([prompt, imagePart])
  const response = await result.response
  const text = response.text()

  // JSON 배열 파싱
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const ingredients = JSON.parse(jsonMatch[0]) as Partial<Ingredient>[]
  return ingredients.map((item, index) => ({
    ...item,
    id: `temp-${index}`,
    expiryDate: '',
  }))
}
