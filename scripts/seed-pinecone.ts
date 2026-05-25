import { Pinecone } from '@pinecone-database/pinecone'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { join } from 'path'

const PINECONE_INDEX = 'refrigerator-detective'
const EMBEDDING_MODEL = 'llama-text-embed-v2'
const NAMESPACE = 'recipe'
const BATCH_SIZE = 96

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
  category: string
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

async function main() {
  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) throw new Error('PINECONE_API_KEY not set')

  const csvPath = join(process.cwd(), 'recipes_10000_rows.csv')
  const content = readFileSync(csvPath, 'utf-8')

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as RecipeRow[]

  const validRecords = records.filter((r) => r.name?.trim() && r.ingredients_raw?.trim())
  console.log(`총 ${validRecords.length}개 레시피 → namespace: "${NAMESPACE}"`)

  const client = new Pinecone({ apiKey })
  const index = client.index(PINECONE_INDEX).namespace(NAMESPACE)

  // 기존 데이터 삭제
  console.log('기존 데이터 삭제 중...')
  try {
    await index.deleteAll()
    console.log('삭제 완료')
  } catch {
    console.log('(기존 데이터 없음)')
  }

  // 배치 업로드
  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE)
    const end = Math.min(i + BATCH_SIZE, validRecords.length)

    // 임베딩할 텍스트 생성
    const texts = batch.map((r) => {
      const steps = parseSteps(r.steps || '[]')
      return [
        `레시피명: ${r.name.trim()}`,
        r.cooking_method ? `조리방법: ${r.cooking_method}` : '',
        r.cooking_level ? `난이도: ${r.cooking_level}` : '',
        r.cook_time_minutes ? `조리시간: ${r.cook_time_minutes}분` : '',
        r.category ? `카테고리: ${r.category}` : '',
        `재료: ${r.ingredients_raw}`,
        steps ? `조리순서: ${steps}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })

    // Pinecone inference API로 임베딩
    const embeddings = await client.inference.embed(
      EMBEDDING_MODEL,
      texts,
      { inputType: 'passage', truncate: 'END' }
    )

    // 벡터 구성
    const vectors = batch.map((r, idx) => ({
      id: `recipe-${r.id || (i + idx)}`,
      values: (embeddings[idx] as { values: number[] }).values,
      metadata: {
        name: r.name.trim(),
        cooking_method: r.cooking_method || '',
        cook_time_minutes: r.cook_time_minutes || '',
        ingredients_raw: r.ingredients_raw,
        image_url: r.image_url || '',
        source_url: r.source_url || '',
        category: r.category || '',
        pageContent: texts[idx],
      },
    }))

    await index.upsert(vectors)
    process.stdout.write(`업로드 중... ${end}/${validRecords.length}\r`)
  }

  console.log(`\n완료! ${validRecords.length}개 레시피가 "${NAMESPACE}" namespace에 업로드됐습니다.`)
}

main().catch((e) => {
  console.error('\n오류:', e.message)
  process.exit(1)
})
