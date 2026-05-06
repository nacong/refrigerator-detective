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
  price: number
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ingredients')
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
    price: row.price ?? 0,
    userId: row.user_email,
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
    .from('ingredients')
    .insert({
      name: body.name,
      emoji: body.emoji,
      quantity: body.quantity,
      expiry_date: body.expiryDate,
      price: body.price ?? 0,
      user_email: session.user.email,
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
    .from('ingredients')
    .delete()
    .eq('id', id)
    .eq('user_email', session.user.email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
