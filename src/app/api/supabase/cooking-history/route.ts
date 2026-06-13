import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type DbRecipeRow = {
  id: number
  name: string
  cook_time_minutes: number
  image_url: string
  ingredient_names: string[]
  steps: Array<{ step: number; description: string }>
}

/** steps 문자열 배열 → db_recipes.steps JSONB 포맷 */
function stepsToDbFormat(steps: string[]): Array<{ step: number; description: string }> {
  return steps.map((s, idx) => {
    const match = s.match(/^\d+[.)]\s*(.+)/)
    return { step: idx + 1, description: (match ? match[1] : s).trim() }
  })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const { data: history, error } = await supabase
    .from('my_history')
    .select('id, user_email, db_recipe_id, recipe_name, cooked_at, cook_time, photo_url, rating')
    .eq('user_email', session.user.email)
    .order('cooked_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!history || history.length === 0) return NextResponse.json([])

  // db_recipe_id 가 있는 것 → ID로 조회, 없는 것 → recipe_name으로 조회 (하위 호환)
  const ids = history.map((h) => h.db_recipe_id).filter((v): v is number => v != null)
  const names = history
    .filter((h) => h.db_recipe_id == null && h.recipe_name)
    .map((h) => h.recipe_name as string)

  const [{ data: byId }, { data: byName }] = await Promise.all([
    ids.length > 0
      ? supabase
          .from('db_recipes')
          .select('id, name, cook_time_minutes, image_url, ingredient_names, steps')
          .in('id', ids)
      : Promise.resolve({ data: [] as DbRecipeRow[] }),
    names.length > 0
      ? supabase
          .from('db_recipes')
          .select('id, name, cook_time_minutes, image_url, ingredient_names, steps')
          .in('name', names)
      : Promise.resolve({ data: [] as DbRecipeRow[] }),
  ])

  const idMap = Object.fromEntries(((byId ?? []) as DbRecipeRow[]).map((r) => [r.id, r]))
  const nameMap = Object.fromEntries(((byName ?? []) as DbRecipeRow[]).map((r) => [r.name, r]))

  const result = history.map((h) => {
    const r: DbRecipeRow | undefined =
      h.db_recipe_id != null ? idMap[h.db_recipe_id] : nameMap[h.recipe_name]
    const steps = (r?.steps ?? []) as Array<{ step: number; description: string }>

    return {
      id: h.id,
      user_email: h.user_email,
      cooked_at: h.cooked_at,
      recipe_name: h.recipe_name ?? r?.name ?? '',
      cook_time: h.cook_time > 0 ? h.cook_time : (r?.cook_time_minutes ?? 0),
      rating: (h as { rating?: number | null }).rating ?? null,
      // 사용자 완성 사진 우선, 없으면 db_recipes 이미지
      thumbnail_url: h.photo_url || r?.image_url || '',
      photo_url: h.photo_url || '',
      ingredients: r?.ingredient_names ?? [],
      steps: steps.map((s) => s.description),
      db_recipe_id: h.db_recipe_id ?? null,
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

  // ── db_recipe_id 결정 (3단계 fallback) ────────────────────────

  // 1단계: 클라이언트가 직접 보낸 ID 사용
  let dbRecipeId: number | null = body.dbRecipeId != null ? Number(body.dbRecipeId) : null

  // 2단계: name으로 db_recipes 조회
  if (dbRecipeId == null && body.recipeName) {
    const { data, error: lookupErr } = await supabase
      .from('db_recipes')
      .select('id')
      .eq('name', body.recipeName)
      .order('id', { ascending: false }) // 최신 AI 생성본 우선
      .limit(1)
      .maybeSingle()
    if (lookupErr) console.error('[cooking-history] db_recipes lookup error:', lookupErr.message)
    dbRecipeId = data ? Number((data as { id: unknown }).id) : null
  }

  // 3단계: 여전히 없고 recipeData 가 있으면 (AI 생성 레시피) → db_recipes 에 직접 저장
  if (dbRecipeId == null && body.recipeName && body.recipeData) {
    const rd = body.recipeData as {
      cookingMethod?: string
      cookTimeMinutes?: number
      ingredientsRaw?: string
      steps?: string[]
    }
    const ingredientNames = (rd.ingredientsRaw ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    const { data: inserted, error: insertErr } = await supabase
      .from('db_recipes')
      .insert({
        name: body.recipeName,
        cooking_method: rd.cookingMethod ?? '',
        cook_time_minutes: rd.cookTimeMinutes ?? 0,
        ingredients_raw: rd.ingredientsRaw ?? '',
        ingredient_names: ingredientNames,
        steps: stepsToDbFormat(rd.steps ?? []),
        image_url: '',
        recipe_from: 'AI',
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[cooking-history] db_recipes insert error:', insertErr.message)
    } else {
      dbRecipeId = inserted ? Number((inserted as { id: unknown }).id) : null
    }
  }
  // ──────────────────────────────────────────────────────────────

  const { data, error } = await supabase
    .from('my_history')
    .insert({
      user_email: session.user.email,
      recipe_name: body.recipeName ?? '',
      cooked_at: new Date().toISOString(),
      cook_time: body.cookTime ?? 0,
      db_recipe_id: dbRecipeId,
      photo_url: body.photoUrl ?? null,
      rating: body.rating ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('my_history')
    .delete()
    .eq('id', id)
    .eq('user_email', session.user.email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
