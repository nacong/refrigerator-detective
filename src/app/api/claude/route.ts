import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchRecipes } from '@/lib/rag'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

function parseStepsFromContent(pageContent: string): string[] {
  const match = pageContent.match(/조리순서:\s*(.+)/)
  if (!match) return []
  return match[1]
    .split(/\d+\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { message, history, selectedIngredients } = await req.json()

  // Pinecone 검색 쿼리: 사용자 메시지 + 선택된 재료
  const ingredientText =
    Array.isArray(selectedIngredients) && selectedIngredients.length > 0
      ? `재료: ${selectedIngredients.join(', ')}`
      : ''
  const searchQuery = [message, ingredientText].filter(Boolean).join(' ')

  // 유사 레시피 검색
  let recipeContext = ''
  let recipeCards: { name: string; cookingMethod: string; cookTimeMinutes: number; ingredientsRaw: string; imageUrl: string; sourceUrl: string; steps: string[] }[] = []
  try {
    const results = await searchRecipes(searchQuery, 5)
    if (results.length > 0) {
      recipeContext = results.map((doc) => doc.pageContent).join('\n\n---\n\n')
      const seen = new Set<string>()
      recipeCards = results
        .map((doc) => ({
          name: String(doc.metadata.name ?? ''),
          cookingMethod: String(doc.metadata.cooking_method ?? ''),
          cookTimeMinutes: parseInt(String(doc.metadata.cook_time_minutes ?? '0')) || 0,
          ingredientsRaw: String(doc.metadata.ingredients_raw ?? ''),
          imageUrl: String(doc.metadata.image_url ?? ''),
          sourceUrl: String(doc.metadata.source_url ?? ''),
          steps: parseStepsFromContent(doc.pageContent),
        }))
        .filter((r) => r.name && !seen.has(r.name) && seen.add(r.name))
    }
  } catch {
    // Pinecone 미연결 상태에서도 기본 응답 제공
  }

  const systemPrompt = `당신은 냉장고 탐정의 AI 어시스턴트 "냉탐이"입니다.
사용자가 가진 식재료를 바탕으로 맛있는 레시피를 추천해주세요.
친절하고 실용적으로 답변하며, 한국어로 대화합니다.
레시피 추천 시 재료, 조리 순서를 간결하게 알려주세요.
인사말 없이 바로 레시피 내용으로 시작하세요. "안녕하세요" 같은 문구는 사용하지 마세요.
${recipeContext ? `\n다음은 관련 레시피 데이터베이스에서 검색된 레시피입니다:\n\n${recipeContext}\n\n위 레시피를 참고하여 답변하세요. 레시피를 추천할 때는 반드시 데이터베이스에 있는 "레시피명:" 값을 그대로 사용하세요. 이름을 절대 바꾸거나 재배열하지 마세요.` : ''}
${ingredientText ? `\n사용자가 선택한 재료: ${ingredientText}` : ''}`

  const contents = [
    ...(Array.isArray(history) ? history : []).map(
      (m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    ),
    { role: 'user', parts: [{ text: message }] },
  ]

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    systemInstruction: systemPrompt,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const maxRetries = 3
      let lastErr: unknown

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 2000))
          const result = await model.generateContentStream({ contents })
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
          controller.close()
          return
        } catch (err) {
          lastErr = err
          const msg = err instanceof Error ? err.message : String(err)
          // 503(과부하)만 재시도, 나머지는 즉시 실패
          if (!msg.includes('503')) break
        }
      }

      const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
      console.error('[claude route error]', msg)
      const isOverload = msg.includes('503')
      controller.enqueue(
        encoder.encode(
          isOverload
            ? 'AI 서버가 일시적으로 혼잡해요. 잠시 후 다시 시도해주세요. 🙏'
            : `오류: ${msg}`
        )
      )
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
