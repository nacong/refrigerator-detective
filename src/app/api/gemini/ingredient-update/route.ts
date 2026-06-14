import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI } from '@google/genai'
import type { Ingredient } from '@/types'

export const dynamic = 'force-dynamic'

export interface IngredientUpdate {
  id: string
  name: string
  emoji: string
  action: 'remove' | 'reduce'
  oldQuantity?: string
  newQuantity?: string // reduce일 때만
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { recipeName, ingredientsUsed, currentIngredients } = (await req.json()) as {
    recipeName: string
    ingredientsUsed: string
    currentIngredients: Ingredient[]
  }

  if (!currentIngredients || currentIngredients.length === 0) {
    return NextResponse.json({ updates: [] })
  }

  const ingredientList = currentIngredients
    .map((i) => `- id: "${i.id}", name: "${i.name}", emoji: "${i.emoji}", quantity: "${i.quantity}"`)
    .join('\n')

  const prompt = `요리 정보:
요리 이름: ${recipeName}
레시피에 사용된 재료: ${ingredientsUsed || '정보 없음'}

현재 냉장고 재료 목록:
${ingredientList}

위 요리를 완성했을 때 냉장고 재료가 얼마나 소비되었는지 분석해주세요.

[규칙]
1. 레시피에 사용된 재료 중 냉장고에 있는 것만 포함 (id 기준)
2. 완전히 소진: action "remove"
3. 일부 남음: action "reduce", newQuantity에 남은 양을 현재 quantity와 같은 단위로 표기 (예: 현재 "2개"면 → "1개", 현재 "300g"이면 → "150g")
4. 전혀 사용하지 않은 재료는 포함하지 마세요
5. 소금·후추·간장·설탕·식용유 등 기본 양념/조미료는 제외하세요
6. 주 재료 위주로만 포함하세요. 소량만 쓰는 부재료나 변화가 거의 없는 재료(10% 미만 소비)는 제외하세요

JSON 배열로만 응답하세요 (다른 텍스트 없이):
[{"id":"재료id","name":"이름","emoji":"이모지","action":"remove","newQuantity":null}]`

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 0 } },
    })
    const text = result.text ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ updates: [] })

    const raw = JSON.parse(jsonMatch[0]) as IngredientUpdate[]
    // 실제 냉장고에 있는 id만 통과 (LLM 환각 방지)
    const validIds = new Set(currentIngredients.map((i) => i.id))
    const quantityMap = Object.fromEntries(currentIngredients.map((i) => [i.id, i.quantity]))
    const updates = raw
      .filter((u) => validIds.has(u.id) && (u.action === 'remove' || u.action === 'reduce'))
      .map((u) => ({ ...u, oldQuantity: quantityMap[u.id] ?? undefined }))

    return NextResponse.json({ updates })
  } catch (err) {
    console.error('[ingredient-update error]', err)
    return NextResponse.json({ updates: [] })
  }
}
