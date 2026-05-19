import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cooking_history')
    .select('*')
    .eq('user_email', session.user.email)
    .order('cooked_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history = data ?? []
  if (history.length === 0) return NextResponse.json([])

  // recipes.thumbnail_url 조회 (recipe_name 기준)
  const names = Array.from(new Set(history.map((h: { recipe_name: string }) => h.recipe_name)))
  const { data: recipeRows } = await supabase
    .from('recipes')
    .select('name, thumbnail_url, cost_per_serving, ingredients')
    .in('name', names)

  const recipeMap: Record<string, { thumbnail_url: string; cost_per_serving: number; ingredients: string[] }> = {}
  for (const r of recipeRows ?? []) {
    recipeMap[r.name] = {
      thumbnail_url: r.thumbnail_url ?? '',
      cost_per_serving: r.cost_per_serving ?? 0,
      ingredients: r.ingredients ?? [],
    }
  }

  const result = history.map((h: { recipe_name: string }) => ({
    ...h,
    thumbnail_url: recipeMap[h.recipe_name]?.thumbnail_url ?? '',
    cost_per_serving: recipeMap[h.recipe_name]?.cost_per_serving ?? 0,
    ingredients: recipeMap[h.recipe_name]?.ingredients ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('cooking_history')
    .insert({
      user_email: session.user.email,
      recipe_name: body.recipeName,
      cook_time: body.cookTime ?? 0,
      cooked_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
