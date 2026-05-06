-- ============================================================
-- 002_recipe_catalog.sql
-- 공용 레시피 카탈로그 (CSV 샘플 데이터 / Pinecone 연동)
-- ============================================================

create table if not exists public.recipe_catalog (
  id              text        primary key,  -- CSV의 id 컬럼
  name            text        not null,
  cooking_method  text        not null default '',
  cooking_level   text        not null default '',
  cook_time_minutes integer   not null default 0,
  serving_size    text        not null default '',
  ingredients_raw text        not null default '',
  image_url       text        not null default '',
  source_url      text        not null default '',
  created_at      timestamptz default now()
);

-- 공용 카탈로그는 인증된 사용자 누구나 조회 가능
alter table public.recipe_catalog enable row level security;

create policy "recipe_catalog: 전체 조회"
  on public.recipe_catalog for select
  using (true);

create policy "recipe_catalog: service_role 삽입"
  on public.recipe_catalog for insert
  using (auth.role() = 'service_role');

create policy "recipe_catalog: service_role 수정"
  on public.recipe_catalog for update
  using (auth.role() = 'service_role');

create index if not exists idx_recipe_catalog_name on public.recipe_catalog (name);
