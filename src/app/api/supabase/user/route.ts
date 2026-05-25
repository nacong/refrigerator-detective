import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const email = session.user.email

  const { error: ingredientsError } = await supabase
    .from('my_ingredients')
    .delete()
    .eq('user_email', email)

  if (ingredientsError) {
    return NextResponse.json({ error: ingredientsError.message }, { status: 500 })
  }

  const { error: historyError } = await supabase
    .from('my_history')
    .delete()
    .eq('user_email', email)

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
