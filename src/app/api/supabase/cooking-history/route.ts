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

  const { data: history, error } = await supabase
    .from('cooking_history')
    .select('id, user_email, recipe_id, cooked_at, cook_time')
    .eq('user_email', session.user.email)
    .order('cooked_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = history ?? []
  if (rows.length === 0) return NextResponse.json([])

  // recipe_id 로 recipes 조인
  const recipeIds = Array.from(
    new Set(rows.map((h) => h.recipe_id).filter(Boolean))
  )

  const recipeMap: Record<string, {
    name: string
    thumbnail_url: string
    cost_per_serving: number
    ingredients: string[]
    steps: string[]
  }> = {}

  if (recipeIds.length > 0) {
    const { data: recipeRows } = await supabase
      .from('recipes')
      .select('id, name, thumbnail_url, cost_per_serving, ingredients, steps')
      .in('id', recipeIds)

    for (const r of recipeRows ?? []) {
      recipeMap[r.id] = {
        name: r.name ?? '',
        thumbnail_url: r.thumbnail_url ?? '',
        cost_per_serving: r.cost_per_serving ?? 0,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        steps: Array.isArray(r.steps) ? r.steps : [],
      }
    }
  }

  const result = rows.map((h) => ({
    id: h.id,
    user_email: h.user_email,
    recipe_id: h.recipe_id,
    cooked_at: h.cooked_at,
    cook_time: h.cook_time ?? recipeMap[h.recipe_id]?.cook_time ?? 0,
    // recipes 조인
    recipe_name: recipeMap[h.recipe_id]?.name ?? '',
    thumbnail_url: recipeMap[h.recipe_id]?.thumbnail_url ?? '',
    cost_per_serving: recipeMap[h.recipe_id]?.cost_per_serving ?? 0,
    ingredients: recipeMap[h.recipe_id]?.ingredients ?? [],
    steps: recipeMap[h.recipe_id]?.steps ?? [],
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

  // recipeName 으로 recipes 에서 id, cook_time 조회
  let recipeId: string | null = null
  let cookTime: number = body.cookTime ?? 0

  if (body.recipeName) {
    const { data: recipe } = await supabase
      .from('recipes')
      .select('id, cook_time')
      .eq('name', body.recipeName)
      .limit(1)
      .maybeSingle()

    if (recipe) {
      recipeId = recipe.id
      cookTime = recipe.cook_time ?? cookTime
    }
  }

  const { data, error } = await supabase
    .from('cooking_history')
    .insert({
      user_email: session.user.email,
      recipe_id: recipeId,
      cooked_at: new Date().toISOString(),
      cook_time: cookTime,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
