import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPineconeClient, PINECONE_INDEX, EMBEDDING_MODEL } from '@/lib/pinecone'
import { PineconeStore } from '@langchain/pinecone'
import { PineconeEmbeddings } from '@langchain/pinecone'
import { Document } from '@langchain/core/documents'
import { getSupabaseAdmin } from '@/lib/supabase'

// Node.js 전용 모듈 — 서버 런타임에서만 실행됨
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RecipeRow {
  id: string
  name: string
  cooking_method: string
  cooking_level: string
  cook_time_minutes: string
  serving_size: string
  ingredients_raw: string
  ingredient_names: string
  steps: string
  source_url: string
  image_url: string
}

function parseSteps(stepsStr: string): string {
  try {
    const cleaned = stepsStr
      .replace(/'/g, '"')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false')
      .replace(/None/g, 'null')
    const steps = JSON.parse(cleaned) as { step: number; description: string }[]
    return steps.map((s) => `${s.step}. ${s.description}`).join(' ')
  } catch {
    return ''
  }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const csvPath = join(process.cwd(), 'samples', 'recipe.csv')
    const content = readFileSync(csvPath, 'utf-8')

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as RecipeRow[]

    const validRecords = records.filter((r) => r.name?.trim() && r.ingredients_raw?.trim())

    // LangChain Document 생성 (Pinecone 임베딩용)
    const docs = validRecords.map((r) => {
      const steps = parseSteps(r.steps || '[]')
      const pageContent = [
        `레시피명: ${r.name.trim()}`,
        r.cooking_method ? `조리방법: ${r.cooking_method}` : '',
        r.cooking_level ? `난이도: ${r.cooking_level}` : '',
        r.cook_time_minutes ? `조리시간: ${r.cook_time_minutes}분` : '',
        `재료: ${r.ingredients_raw}`,
        steps ? `조리순서: ${steps}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      return new Document({
        pageContent,
        metadata: {
          id: r.id || '',
          name: r.name.trim(),
          cooking_method: r.cooking_method || '',
          cook_time_minutes: r.cook_time_minutes || '',
          ingredients_raw: r.ingredients_raw,
          image_url: r.image_url || '',
          source_url: r.source_url || '',
        },
      })
    })

    // 1. Pinecone 임베딩 & 업로드 (llama-text-embed-v2 최대 96개 제한)
    const client = getPineconeClient()
    const index = client.index(PINECONE_INDEX)
    const embeddings = new PineconeEmbeddings({ model: EMBEDDING_MODEL })

    // 기존 벡터 전체 삭제 후 재업로드 (중복 방지)
    await index.deleteAll()

    const batchSize = 96
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize)
      await PineconeStore.fromDocuments(batch, embeddings, { pineconeIndex: index })
    }

    // 2. Supabase recipes upsert (user_email null = 공용 카탈로그)
    const supabase = getSupabaseAdmin()
    const catalogRows = validRecords.map((r) => ({
      name: r.name.trim(),
      cook_time: r.cook_time_minutes ? parseInt(r.cook_time_minutes) || 0 : 0,
      cost_per_serving: 0,
      thumbnail_url: r.image_url || '',
      ingredients: r.ingredients_raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: r.source_url || '',
      user_email: null,
    }))

    // 50개씩 배치 insert (중복 방지: 기존 카탈로그 삭제 후 재삽입)
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .is('user_email', null)
    if (deleteError) throw new Error(`기존 카탈로그 삭제 실패: ${deleteError.message}`)

    const supabaseBatch = 50
    for (let i = 0; i < catalogRows.length; i += supabaseBatch) {
      const batch = catalogRows.slice(i, i + supabaseBatch)
      const { error } = await supabase.from('recipes').insert(batch)
      if (error) throw new Error(`Supabase insert 실패: ${error.message}`)
    }

    return NextResponse.json({ success: true, count: validRecords.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : '인덱싱 중 오류가 발생했습니다'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
