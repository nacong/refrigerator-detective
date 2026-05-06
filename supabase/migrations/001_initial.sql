-- ============================================================
-- 001_initial.sql
-- 냉장고 탐정 — 초기 스키마 & RLS 정책
-- ============================================================

-- ─── ingredients (식재료) ────────────────────────────────────
create table if not exists public.ingredients (
  id          uuid        default gen_random_uuid() primary key,
  name        text        not null,
  emoji       text        not null default '🥘',
  quantity    text        not null default '적당량',
  expiry_date text        not null default '',
  user_email  text        not null,
  created_at  timestamptz default now()
);

alter table public.ingredients enable row level security;

-- 사용자는 자신의 식재료만 조회/삽입/삭제 가능
create policy "ingredients: 본인 조회"
  on public.ingredients for select
  using (auth.jwt() ->> 'email' = user_email);

create policy "ingredients: 본인 삽입"
  on public.ingredients for insert
  with check (auth.jwt() ->> 'email' = user_email);

create policy "ingredients: 본인 수정"
  on public.ingredients for update
  using (auth.jwt() ->> 'email' = user_email);

create policy "ingredients: 본인 삭제"
  on public.ingredients for delete
  using (auth.jwt() ->> 'email' = user_email);

-- 서버(service_role)는 RLS 우회 — NextAuth 세션 기반 API 라우트용
create policy "ingredients: service_role 우회"
  on public.ingredients
  using (auth.role() = 'service_role');


-- ─── recipes (요리 기록) ──────────────────────────────────────
create table if not exists public.recipes (
  id               uuid        default gen_random_uuid() primary key,
  name             text        not null,
  cook_time        integer     not null default 0,
  cost_per_serving integer     not null default 0,
  thumbnail_url    text        not null default '',
  ingredients      text[]      not null default '{}',
  description      text        not null default '',
  user_email       text        not null,
  created_at       timestamptz default now()
);

alter table public.recipes enable row level security;

create policy "recipes: 본인 조회"
  on public.recipes for select
  using (auth.jwt() ->> 'email' = user_email);

create policy "recipes: 본인 삽입"
  on public.recipes for insert
  with check (auth.jwt() ->> 'email' = user_email);

create policy "recipes: 본인 삭제"
  on public.recipes for delete
  using (auth.jwt() ->> 'email' = user_email);

create policy "recipes: service_role 우회"
  on public.recipes
  using (auth.role() = 'service_role');


-- ─── 인덱스 ──────────────────────────────────────────────────
create index if not exists idx_ingredients_user_email on public.ingredients (user_email);
create index if not exists idx_ingredients_expiry     on public.ingredients (expiry_date);
create index if not exists idx_recipes_user_email     on public.recipes (user_email);
create index if not exists idx_recipes_created_at     on public.recipes (created_at desc);
