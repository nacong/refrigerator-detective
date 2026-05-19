import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchRecipes } from '@/lib/rag'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

// 레시피 관련 키워드 — 이 중 하나라도 포함되면 Pinecone 검색 + 카드 표시
const RECIPE_KEYWORDS = [
  '레시피', '요리', '만들', '먹', '추천', '해먹', '음식', '반찬', '국', '찌개',
  '볶음', '구이', '조림', '비빔', '밥', '면', '파스타', '카레', '피자', '빵',
  '스프', '수프', '샐러드', '나물', '전', '튀김', '재료', '뭐 해', '뭐먹',
]

function isRecipeIntent(message: string, selectedIngredients: string[]): boolean {
  if (selectedIngredients.length > 0) return true
  const lower = message.toLowerCase()
  return RECIPE_KEYWORDS.some((k) => lower.includes(k))
}

type RecipeCard = {
  name: string
  cookingMethod: string
  cookTimeMinutes: number
  ingredientsRaw: string
  imageUrl: string
  sourceUrl: string
  steps: string[]
}

function docsToCards(results: Awaited<ReturnType<typeof searchRecipes>>): RecipeCard[] {
  const seen = new Set<string>()
  return results
    .map((doc) => ({
      name: String(doc.metadata.name ?? ''),
      cookingMethod: String(doc.metadata.cooking_method ?? ''),
      cookTimeMinutes: parseInt(String(doc.metadata.cook_time_minutes ?? '0')) || 0,
      ingredientsRaw: String(doc.metadata.ingredients_raw ?? ''),
      imageUrl: String(doc.metadata.image_url ?? ''),
      sourceUrl: String(doc.metadata.source_url ?? ''),
      steps: (() => {
        try {
          const match = doc.pageContent.match(/조리순서:\s*(.+)/)
          if (!match) return []
          return match[1].split(/\d+\.\s+/).map((s) => s.trim()).filter(Boolean)
        } catch { return [] }
      })(),
    }))
    .filter((r) => r.name && !seen.has(r.name) && seen.add(r.name))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { message, history, selectedIngredients } = await req.json()

  const ingredientText =
    Array.isArray(selectedIngredients) && selectedIngredients.length > 0
      ? (selectedIngredients as string[]).join(', ')
      : ''
  const ingredientMention = ingredientText || message
  const isRecipe = isRecipeIntent(message, selectedIngredients ?? [])

  // 시스템 프롬프트 — 인텐트별 분기
  const systemPrompt = isRecipe
    ? `당신은 냉장고 탐정 "냉탐이"입니다.
레시피 설명, 조리 방법은 쓰지 마세요. 아래 형식 한 문장만 쓰세요.
안녕하세요! 냉장고 탐정 냉탐이입니다. 가지고 계신 **{재료명}**를 활용해 만들 수 있는 맛있는 레시피를 추천해 드릴게요!
{재료명} 자리에는 사용자가 언급한 재료를 자연스럽게 넣고, 재료를 특정하기 어려우면 "재료들"이라고 쓰세요.`
    : `당신은 냉장고 탐정 "냉탐이"입니다.
냉탐이는 가지고 있는 재료를 바탕으로 요리하고 싶어지는 레시피를 추천해요.
간결하게 답변하세요. 존댓말을 사용하세요.`

  const contents = [
    ...(Array.isArray(history) ? history : []).map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    ),
    {
      role: 'user',
      parts: [{ text: isRecipe ? `사용자 메시지: ${message}\n사용자 재료: ${ingredientMention}` : message }],
    },
  ]

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    systemInstruction: systemPrompt,
  })

  // ─── Pinecone 검색 + LLM 스트림 시작을 병렬 실행 ────────────
  const searchQuery = [message, ingredientText].filter(Boolean).join(' ')

  const [pineconeResults, llmResult] = await Promise.all([
    isRecipe
      ? searchRecipes(searchQuery, 5).catch(() => [])
      : Promise.resolve([]),
    model.generateContentStream({ contents }).catch((err) => { throw err }),
  ])

  const recipeCards: RecipeCard[] = isRecipe ? docsToCards(pineconeResults) : []

  // ─── 스트리밍 응답 ────────────────────────────────────────────
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of llmResult.stream) {
          const text = chunk.text()
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[claude route error]', msg)
        controller.enqueue(
          encoder.encode(
            msg.includes('503')
              ? 'AI 서버가 일시적으로 혼잡해요. 잠시 후 다시 시도해주세요.'
              : `오류: ${msg}`
          )
        )
        controller.close()
      }
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
