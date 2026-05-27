import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchRecipes } from '@/lib/rag'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ChatRecipe } from '@/types'

export const dynamic = 'force-dynamic'

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

interface GeminiRecipe {
  name: string
  cookTimeMinutes: number
  cookingMethod: string
  ingredientsUsed: string[]
  steps: string[]
}

type RecipeCard = ChatRecipe

function docsToCards(
  results: Awaited<ReturnType<typeof searchRecipes>>,
  dbIdMap: Record<string, number> = {}
): RecipeCard[] {
  const seen = new Set<string>()
  return results
    .map((doc) => {
      const name = String(doc.metadata.name ?? '')
      return {
        name,
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
        dbRecipeId: dbIdMap[name],
      }
    })
    .filter((r) => r.name && !seen.has(r.name) && seen.add(r.name))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  // mode: 'search'(기본, Pinecone+LLM) | 'generate'(순수 LLM)
  const { message, history, selectedIngredients, mode = 'search' } = await req.json()
  const isGenerateMode = mode === 'generate'

  const ingredientText =
    Array.isArray(selectedIngredients) && selectedIngredients.length > 0
      ? (selectedIngredients as string[]).join(', ')
      : ''
  const isRecipe = isRecipeIntent(message, selectedIngredients ?? [])

  const systemPrompt = isRecipe
    ? `당신은 냉장고 탐정 "냉탐이"입니다.
레시피 목록은 따로 카드로 보여드리니 레시피 설명·조리 방법은 쓰지 마세요.
사용자의 요청을 자연스럽게 반영한 한 문장 인사만 쓰세요. 예시:
- "달달한 디저트 추천" → "안녕하세요! 달달한 디저트 레시피를 찾아드릴게요!"
- "김치로 만들 수 있는 요리" → "안녕하세요! 김치를 활용한 맛있는 레시피를 추천해 드릴게요!"
- 재료 선택 시 → "안녕하세요! 선택하신 재료로 만들 수 있는 레시피를 찾아드릴게요!"
존댓말 사용. 레시피에 대한 내용은 쓰지 마세요.`
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
      parts: [{ text: isRecipe ? `사용자 메시지: ${message}\n사용자 재료: ${ingredientText || message}` : message }],
    },
  ]

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  })

  let recipeCards: RecipeCard[] = []
  let llmResult: Awaited<ReturnType<typeof model.generateContentStream>>

  try {
    if (isRecipe && isGenerateMode) {
      // ── 생성 모드: 순수 LLM ──────────────────────────────────────
      const recipeModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const recipePrompt = `사용자 요청: ${message}
${ingredientText ? `재료: ${ingredientText}` : ''}

한국 요리 레시피 3개를 JSON 배열로만 응답하세요 (다른 텍스트 없이):
[{"name":"요리이름","cookTimeMinutes":숫자,"cookingMethod":"방법","ingredientsUsed":["재료"],"steps":["1. 단계","2. 단계","3. 단계"]}]`

      const [recipeResult, stream] = await Promise.all([
        recipeModel.generateContent(recipePrompt),
        model.generateContentStream({ contents }),
      ])

      const jsonMatch = recipeResult.response.text().match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GeminiRecipe[]
        recipeCards = parsed.map((r) => ({
          name: r.name ?? '',
          cookingMethod: r.cookingMethod ?? '기타',
          cookTimeMinutes: r.cookTimeMinutes ?? 0,
          ingredientsRaw: (r.ingredientsUsed ?? []).join(', '),
          imageUrl: '',
          sourceUrl: '',
          steps: r.steps ?? [],
        }))
      }
      llmResult = stream

    } else if (isRecipe) {
      // ── 찾기 모드: Pinecone + LLM (기본) ───────────────────────
      const searchQuery = [message, ingredientText].filter(Boolean).join(' ')
      const [pineconeResults, stream] = await Promise.all([
        searchRecipes(searchQuery, 5),
        model.generateContentStream({ contents }),
      ])

      let dbIdMap: Record<string, number> = {}
      if (pineconeResults.length > 0) {
        const names = pineconeResults.map((doc) => String(doc.metadata.name ?? '')).filter(Boolean)
        const supabase = getSupabaseAdmin()
        const { data: dbRows } = await supabase
          .from('db_recipes')
          .select('id, name')
          .in('name', names)
        dbIdMap = Object.fromEntries(
          (dbRows ?? []).map((r: { id: number; name: string }) => [r.name, r.id])
        )
      }

      recipeCards = docsToCards(pineconeResults, dbIdMap)
      llmResult = stream

    } else {
      // ── 일반 대화 ────────────────────────────────────────────────
      llmResult = await model.generateContentStream({ contents })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[claude route error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

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
