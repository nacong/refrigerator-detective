import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface RecipeRow {
  id: string
  name: string
  cook_time: number
  cost_per_serving: number
  thumbnail_url: string | null
  ingredients: string[]
  description: string | null
  created_at: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_email', session.user.email)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const recipes = (data as RecipeRow[] || []).map((row) => ({
    id: row.id,
    name: row.name,
    cookTime: row.cook_time,
    costPerServing: row.cost_per_serving,
    thumbnailUrl: row.thumbnail_url,
    ingredients: row.ingredients || [],
    description: row.description,
    createdAt: row.created_at,
  }))

  return NextResponse.json(recipes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      name: body.name,
      cook_time: body.cookTime,
      cost_per_serving: body.costPerServing,
      thumbnail_url: body.thumbnailUrl,
      ingredients: body.ingredients,
      description: body.description,
      user_email: session.user.email,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
