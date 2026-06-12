import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI } from '@google/genai'
import type { ChatRecipe } from '@/types'

export const dynamic = 'force-dynamic'

interface GeminiRecipe {
  name: string
  cookTimeMinutes: number
  cookingMethod: string
  ingredientsUsed: string[]
  steps: string[]
}

/** 제공된 재료 목록에 없는 신선 재료(양념류 제외)를 찾아 반환 */
function findUnlistedFreshIngredients(used: string[], allowed: string[]): string[] {
  const BASIC_SEASONINGS = new Set([
    '소금', '후추', '설탕', '식용유', '올리브오일', '참기름', '들기름',
    '간장', '된장', '고추장', '쌈장', '고춧가루', '다진마늘', '마늘',
    '생강', '식초', '물', '청주', '맛술', '굴소스', '케첩', '마요네즈',
    '녹말', '전분', '밀가루', '빵가루', '참깨', '깨', '버터',
  ])
  const allowedSet = new Set(allowed.map((s) => s.trim()))
  return used.filter(
    (item) => !allowedSet.has(item.trim()) && !BASIC_SEASONINGS.has(item.trim())
  )
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { ingredients } = (await req.json()) as { ingredients: string[] }
  const encoder = new TextEncoder()

  // 재료 없음 처리
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

[냉장고에 있는 재료 — 이것이 전부입니다]
${ingredientList}

위 재료들만 사용해서 만들 수 있는 레시피 3개를 추천해주세요.

[절대 규칙 — 반드시 지켜야 합니다]
1. 위 목록에 없는 신선 재료(채소, 고기, 생선, 해산물, 유제품, 과일 등)는 절대로 사용하면 안 됩니다
2. 아래 기본 양념/조리재료는 목록에 없어도 사용할 수 있습니다:
   소금, 후추, 설탕, 식용유, 올리브오일, 참기름, 들기름, 간장, 된장, 고추장, 쌈장, 고춧가루,
   다진마늘, 생강, 식초, 물, 청주, 맛술, 굴소스, 케첩, 마요네즈, 녹말, 전분, 밀가루,
   빵가루, 참깨, 버터
3. 목록에 있는 재료를 최대한 활용하는 요리를 선택하세요
4. 실제로 만들 수 있는 현실적인 레시피만 추천하세요

다음 JSON 형식으로만 응답해주세요 (JSON 이외의 텍스트는 절대 포함하지 마세요):
[
  {
    "name": "요리 이름",
    "cookTimeMinutes": 20,
    "cookingMethod": "볶음",
    "ingredientsUsed": ["재료1", "재료2"],
    "steps": ["1. 단계 설명", "2. 단계 설명", "3. 단계 설명"]
  }
]`

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  let recipeCards: ChatRecipe[] = []
  let replyText = ''

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { thinkingConfig: { thinkingBudget: 0 } },
    })
    const text = result.text ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeminiRecipe[]

      // 없는 재료 침범 여부 검증
      const violations: string[] = []
      recipeCards = parsed.map((r) => {
        const unlisted = findUnlistedFreshIngredients(r.ingredientsUsed ?? [], ingredients)
        if (unlisted.length > 0) violations.push(...unlisted)
        return {
          name: r.name ?? '',
          cookingMethod: r.cookingMethod ?? '기타',
          cookTimeMinutes: r.cookTimeMinutes ?? 0,
          ingredientsRaw: (r.ingredientsUsed ?? []).join(', '),
          imageUrl: '',
          sourceUrl: '',
          steps: r.steps ?? [],
          // dbRecipeId 없음 — 요리 완료 시 cooking-history POST에서 db_recipes 저장
        }
      })

      const violationNote =
        violations.length > 0
          ? `\n\n⚠️ 일부 재료(${Array.from(new Set(violations)).join(', ')})는 냉장고에 없을 수 있어요. 재료를 확인하고 조절해주세요!`
          : ''

      replyText = `냉장고 재료로 만들 수 있는 레시피예요! 🧹✨\n레시피 카드를 눌러 자세한 조리법을 확인해보세요.${violationNote}`
    } else {
      replyText = '레시피를 생성하는 데 실패했어요. 😥 다시 시도해주세요.'
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[fridge-recipe error]', msg)
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
      'Access-Control-Expose-Headers': 'X-Recipe-Cards',
    },
  })
}
