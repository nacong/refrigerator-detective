import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface IngredientRow {
  id: string
  name: string
  emoji: string
  quantity: string
  expiry_date: string
  user_email: string
  location?: string
  category?: string
  created_at?: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('my_ingredients')
    .select('*')
    .eq('user_email', session.user.email)
    .order('expiry_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ingredients = (data as IngredientRow[] || []).map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji || '🥘',
    quantity: row.quantity,
    expiryDate: row.expiry_date,
    userId: row.user_email,
    location: row.location ?? '냉장실',
    category: row.category ?? '기타',
    createdAt: row.created_at,
  }))

  return NextResponse.json(ingredients)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('my_ingredients')
    .insert({
      name: body.name,
      emoji: body.emoji,
      quantity: body.quantity,
      expiry_date: body.expiryDate,
      user_email: session.user.email,
      location: body.location ?? '냉장실',
      category: body.category ?? '기타',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { id, name, emoji, quantity, location, category, expiryDate } = await req.json()
  if (!id) return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })

  const updateFields: Record<string, string> = {}
  if (name !== undefined) updateFields.name = name
  if (emoji !== undefined) updateFields.emoji = emoji
  if (quantity !== undefined) updateFields.quantity = quantity
  if (location !== undefined) updateFields.location = location
  if (category !== undefined) updateFields.category = category
  if (expiryDate !== undefined) updateFields.expiry_date = expiryDate

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('my_ingredients')
    .update(updateFields)
    .eq('id', id)
    .eq('user_email', session.user.email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
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
    .from('my_ingredients')
    .delete()
    .eq('id', id)
    .eq('user_email', session.user.email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
