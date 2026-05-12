-- ============================================================
-- 004_cooking_history.sql
-- 요리 이력 테이블
-- ============================================================

create table if not exists public.cooking_history (
  id               uuid        default gen_random_uuid() primary key,
  user_email       text        not null,
  recipe_id        uuid        references public.recipes(id) on delete set null,
  recipe_name      text        not null,                    -- recipe 삭제 후에도 이름 보존
  cooked_at        timestamptz default now() not null,
  cook_time        integer     not null default 0,          -- 실제 조리 시간 (분)
  created_at       timestamptz default now()
);

alter table public.cooking_history enable row level security;

-- 사용자는 자신의 요리 이력만 조회/삽입/수정/삭제 가능
create policy "cooking_history: 본인 조회"
  on public.cooking_history for select
  using (auth.jwt() ->> 'email' = user_email);

create policy "cooking_history: 본인 삽입"
  on public.cooking_history for insert
  with check (auth.jwt() ->> 'email' = user_email);

create policy "cooking_history: 본인 수정"
  on public.cooking_history for update
  using (auth.jwt() ->> 'email' = user_email);

create policy "cooking_history: 본인 삭제"
  on public.cooking_history for delete
  using (auth.jwt() ->> 'email' = user_email);

-- 서버(service_role)는 RLS 우회 — NextAuth 세션 기반 API 라우트용
create policy "cooking_history: service_role 우회"
  on public.cooking_history
  using (auth.role() = 'service_role');

-- 인덱스
create index if not exists idx_cooking_history_user_email on public.cooking_history (user_email);
create index if not exists idx_cooking_history_cooked_at  on public.cooking_history (cooked_at desc);
create index if not exists idx_cooking_history_recipe_id  on public.cooking_history (recipe_id);
