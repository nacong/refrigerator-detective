import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

export interface NutritionEstimate {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const body = await req.json()
  const { recipeName, ingredientsRaw } = body as {
    recipeName?: string
    ingredientsRaw?: string
  }

  if (!recipeName) {
    return NextResponse.json({ error: 'recipeName이 필요합니다' }, { status: 400 })
  }

  const prompt = `다음 한국 요리 한 인분의 영양 정보를 JSON으로만 답해주세요 (다른 텍스트 없이):
{"calories":숫자,"protein":숫자,"carbs":숫자,"fat":숫자}
요리: ${recipeName}${ingredientsRaw ? `\n재료: ${ingredientsRaw}` : ''}`

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      console.error('[gemini/nutrition] JSON 파싱 실패:', text)
      return NextResponse.json({ error: '영양 정보 파싱 실패' }, { status: 500 })
    }

    const nutrition = JSON.parse(jsonMatch[0]) as NutritionEstimate
    return NextResponse.json(nutrition)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gemini/nutrition error]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
