/**
 * CSV → Supabase recipes 테이블 임포트 스크립트
 *
 * 실행 방법:
 *   node --env-file=.env.local scripts/import-recipes.mjs
 *
 * CSV 컬럼: id, name, cook_time, cost_per_serving, serving_size,
 *           ingredients(json), steps(json), source_url, created_at, thumbnail_url
 */

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ node --env-file=.env.local scripts/import-recipes.mjs 로 실행하세요.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ingredients JSON → "무 600g" 형식 문자열 배열
function parseIngredients(raw) {
  if (!raw) return []
  try {
    const cleaned = raw.replace(/'/g, '"').replace(/None/g, 'null')
    const arr = JSON.parse(cleaned)
    return arr.map((item) => {
      const name = item.name ?? ''
      const qty = item.quantity != null ? item.quantity : ''
      const unit = item.unit ?? ''
      return `${name} ${qty}${unit}`.trim()
    }).filter(Boolean)
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

// steps JSON → description 문자열 배열
function parseSteps(raw) {
  if (!raw) return []
  try {
    const cleaned = raw.replace(/'/g, '"').replace(/None/g, 'null')
    const arr = JSON.parse(cleaned)
    return arr.map((s) => s.description?.trim()).filter(Boolean)
  } catch {
    return []
  }
}

async function main() {
  console.log('📂 CSV 파싱 중...')
  const content = readFileSync(join(ROOT, 'samples', 'recipe.csv'), 'utf-8').replace(/^﻿/, '')

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })

  const valid = records.filter((r) => r.name?.trim() && r.ingredients)
  console.log(`✅ 유효 레시피 ${valid.length}개 파싱 완료`)

  // 기존 전체 삭제
  console.log('🗑️  기존 recipes 전체 삭제 중...')
  const { error: delErr } = await supabase
    .from('recipes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) {
    console.error('❌ 삭제 실패:', delErr.message)
    process.exit(1)
  }

  const rows = valid.map((r) => ({
    name: r.name.trim(),
    cook_time: parseInt(r.cook_time) || 0,
    cost_per_serving: parseInt(r.cost_per_serving) || 0,
    thumbnail_url: r.thumbnail_url?.trim() || '',
    serving_size: parseInt(r.serving_size) || null,
    ingredients: parseIngredients(r.ingredients),
    steps: parseSteps(r.steps),
    source_url: r.source_url?.trim() || '',
  }))

  const BATCH = 50
  let inserted = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('recipes').insert(batch)
    if (error) {
      console.error(`❌ insert 실패 (${i}~${i + BATCH}):`, error.message)
      process.exit(1)
    }
    inserted += batch.length
    process.stdout.write(`\r⏳ ${inserted} / ${rows.length} 삽입 완료...`)
  }

  console.log(`\n✅ 완료! ${inserted}개 레시피 저장됐습니다.`)
}

main().catch((err) => { console.error('❌', err); process.exit(1) })
