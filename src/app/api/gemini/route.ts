import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recognizeIngredients } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

// Gemini Vision으로 식재료 이미지 인식
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: '이미지 데이터가 필요합니다' }, { status: 400 })
    }

    const ingredients = await recognizeIngredients(imageBase64, mimeType)
    return NextResponse.json({ ingredients })
  } catch (error) {
    console.error('Gemini API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '식재료 인식에 실패했습니다' },
      { status: 500 }
    )
  }
}
