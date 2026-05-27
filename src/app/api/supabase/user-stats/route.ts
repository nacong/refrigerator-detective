import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET — 현재 통계 조회
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('user_stats')
    .select('cleared_count')
    .eq('user_email', session.user.email)
    .single()

  return NextResponse.json({ cleared_count: data?.cleared_count ?? 0 })
}

// POST — 냉털 횟수 +1
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  // upsert 후 rpc로 atomic increment
  const { data: existing } = await supabase
    .from('user_stats')
    .select('cleared_count')
    .eq('user_email', session.user.email)
    .single()

  const newCount = (existing?.cleared_count ?? 0) + 1

  await supabase
    .from('user_stats')
    .upsert(
      { user_email: session.user.email, cleared_count: newCount, updated_at: new Date().toISOString() },
      { onConflict: 'user_email' }
    )

  return NextResponse.json({ cleared_count: newCount })
}
