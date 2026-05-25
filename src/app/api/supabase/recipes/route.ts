import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface DbRecipeRow {
  id: number
  name: string | null
  cook_time_minutes: number | null
  image_url: string | null
  ingredient_names: string[] | null
  steps: string[] | null
  created_at: string | null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('db_recipes')
    .select('id, name, cook_time_minutes, image_url, ingredient_names, steps, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const recipes = (data as DbRecipeRow[] || []).map((row) => ({
    id: String(row.id),
    name: row.name ?? '',
    cookTime: row.cook_time_minutes ?? 0,
    costPerServing: 0,
    thumbnailUrl: row.image_url ?? undefined,
    ingredients: row.ingredient_names ?? [],
    steps: row.steps ?? [],
    createdAt: row.created_at ?? undefined,
  }))

  return NextResponse.json(recipes)
}
