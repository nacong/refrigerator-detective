import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { extractYouTubeId } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export interface SoloCookingStep {
  description: string
  video_start: number
  video_end: number
}

export interface SoloCookingVideo {
  id: number
  title: string
  emoji: string
  channel_name: string
  youtube_url: string
  youtube_video_id: string  // URL에서 파생
  cook_time_minutes: number
  ingredients: string[]
  steps: SoloCookingStep[]
}


export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('solo_cooking_videos')
    .select('*')
    .order('id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const videos: SoloCookingVideo[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    emoji: row.emoji ?? '🍳',
    channel_name: row.channel_name,
    youtube_url: row.youtube_url,
    youtube_video_id: extractYouTubeId(row.youtube_url),
    cook_time_minutes: row.cook_time_minutes ?? 0,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
  }))

  return NextResponse.json(videos)
}
