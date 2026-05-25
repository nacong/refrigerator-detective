import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchRecipes } from '@/lib/rag'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const ingredients = req.nextUrl.searchParams.get('ingredients') ?? ''

  try {
    if (!ingredients) return NextResponse.json([])
    const results = await searchRecipes(ingredients, 5)

    const seen = new Set<string>()
    const recipes = results.flatMap((doc) => {
      const name = String(doc.metadata.name ?? '').trim()
      if (!name || seen.has(name)) return []
      seen.add(name)

      let steps: string[] = []
      try {
        const match = doc.pageContent.match(/조리순서:\s*(.+)/)
        if (match) {
          steps = match[1].split(/\d+\.\s+/).map((s) => s.trim()).filter(Boolean)
        }
      } catch { /* noop */ }

      return [{
        name,
        cookingMethod: String(doc.metadata.cooking_method ?? ''),
        cookTimeMinutes: parseInt(String(doc.metadata.cook_time_minutes ?? '0')) || 0,
        ingredientsRaw: String(doc.metadata.ingredients_raw ?? ''),
        imageUrl: String(doc.metadata.image_url ?? ''),
        sourceUrl: String(doc.metadata.source_url ?? ''),
        steps,
      }]
    })

    return NextResponse.json(recipes)
  } catch (error) {
    const message = error instanceof Error ? error.message : '추천 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
