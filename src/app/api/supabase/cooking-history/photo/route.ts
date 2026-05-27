import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BUCKET = 'cooking-photos'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: '이미지 데이터가 필요합니다' }, { status: 400 })
  }

  const buffer = Buffer.from(imageBase64, 'base64')
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: '이미지 크기는 5MB 이하여야 합니다' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // 버킷 없으면 생성
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some((b) => b.name === BUCKET)
  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }

  const ext = mimeType.split('/')[1]?.split(';')[0] || 'jpg'
  const safeEmail = session.user.email.replace(/[@.]/g, '_')
  const path = `${safeEmail}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
