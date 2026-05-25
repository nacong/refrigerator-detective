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
    .from('my_history')
    .select('id, user_email, recipe_id, recipe_name, cooked_at, cook_time')
    .eq('user_email', session.user.email)
    .order('cooked_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!history || history.length === 0) return NextResponse.json([])

  // recipe_name으로 db_recipes 일괄 조회
  const names = Array.from(new Set(history.map((h) => h.recipe_name).filter(Boolean))) as string[]
  const recipeMap: Record<string, {
    cook_time_minutes: number
    image_url: string
    ingredient_names: string[]
    steps: Array<{ step: number; description: string }>
  }> = {}

  if (names.length > 0) {
    const { data: recipes } = await supabase
      .from('db_recipes')
      .select('name, cook_time_minutes, image_url, ingredient_names, steps')
      .in('name', names)

    for (const r of recipes ?? []) {
      recipeMap[r.name] = r
    }
  }

  const result = history.map((h) => {
    const r = h.recipe_name ? recipeMap[h.recipe_name] : null
    const steps = (r?.steps ?? []) as Array<{ step: number; description: string }>

    return {
      id: h.id,
      user_email: h.user_email,
      cooked_at: h.cooked_at,
      recipe_name: h.recipe_name ?? '',
      cook_time: h.cook_time > 0 ? h.cook_time : (r?.cook_time_minutes ?? 0),
      thumbnail_url: r?.image_url ?? '',
      ingredients: r?.ingredient_names ?? [],
      steps: steps.map((s) => s.description),
    }
  })

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
    .from('my_history')
    .insert({
      user_email: session.user.email,
      recipe_name: body.recipeName ?? '',
      cooked_at: new Date().toISOString(),
      cook_time: body.cookTime ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
