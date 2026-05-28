import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ChatRecipe } from '@/types'

export const dynamic = 'force-dynamic'

interface GeminiOneMoreResponse {
  additionalIngredient: string
  recipes: Array<{
    name: string
    cookTimeMinutes: number
    cookingMethod: string
    ingredientsUsed: string[]
    steps: string[]
  }>
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { ingredients } = (await req.json()) as { ingredients: string[] }
  const encoder = new TextEncoder()

  if (!ingredients || ingredients.length === 0) {
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('냉장고가 비어있어요! 🥲 먼저 재료를 등록해주세요.'))
        controller.close()
      },
    })
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Recipe-Cards': encodeURIComponent(JSON.stringify([])),
        'Access-Control-Expose-Headers': 'X-Recipe-Cards',
      },
    })
  }

  const ingredientList = ingredients.join(', ')

  const prompt = `당신은 냉장고 탐정 "냉탐이"입니다.

[냉장고에 있는 재료]
${ingredientList}

위 재료들을 가진 사용자에게 재료 딱 하나만 추가로 구매하면 만들 수 있는 맛있는 레시피 3개를 추천해주세요.

[규칙]
1. 추가할 재료는 딱 하나만 선택하세요 (마트에서 쉽게 살 수 있고, 다양한 요리에 활용 가능한 재료)
2. 3개 레시피 모두 같은 추가 재료를 사용하세요
3. 기존 냉장고 재료 + 추가 재료 하나로만 만들 수 있는 현실적인 레시피
4. 기본 양념(소금, 후추, 간장, 설탕, 식용유 등)은 있다고 가정해도 됩니다

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "additionalIngredient": "추가할 재료 이름",
  "recipes": [
    {
      "name": "요리 이름",
      "cookTimeMinutes": 20,
      "cookingMethod": "볶음",
      "ingredientsUsed": ["기존재료1", "기존재료2", "추가재료"],
      "steps": ["1. 단계 설명", "2. 단계 설명", "3. 단계 설명"]
    }
  ]
}`

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  let recipeCards: ChatRecipe[] = []
  let replyText = ''
  let additionalIngredient = ''

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeminiOneMoreResponse
      const added = parsed.additionalIngredient ?? ''
      additionalIngredient = added

      recipeCards = (parsed.recipes ?? []).map((r) => ({
        name: r.name ?? '',
        cookingMethod: r.cookingMethod ?? '기타',
        cookTimeMinutes: r.cookTimeMinutes ?? 0,
        ingredientsRaw: (r.ingredientsUsed ?? []).join(', '),
        imageUrl: '',
        sourceUrl: '',
        steps: r.steps ?? [],
      }))

      replyText = `**${added}** 하나만 추가하면 만들 수 있는 레시피예요! 🛒\n레시피 카드를 눌러 자세한 조리법을 확인해보세요.`
    } else {
      replyText = '레시피를 생성하는 데 실패했어요. 😥 다시 시도해주세요.'
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[one-more-ingredient error]', msg)
    replyText = '레시피 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
  }

  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(replyText))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Recipe-Cards': encodeURIComponent(JSON.stringify(recipeCards)),
      'X-Additional-Ingredient': encodeURIComponent(additionalIngredient),
      'Access-Control-Expose-Headers': 'X-Recipe-Cards, X-Additional-Ingredient',
    },
  })
}
