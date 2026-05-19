-- ============================================================
-- run-migrations.sql
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요.
-- ============================================================

-- [006] recipes: steps, cooking_method 컬럼 추가
alter table public.recipes
  add column if not exists steps text[] not null default '{}';

alter table public.recipes
  add column if not exists cooking_method text not null default '';

-- [007] cooking_history: 불필요한 컬럼 삭제
-- (user_email, recipe_id, cooked_at 만 유지)
alter table public.cooking_history
  drop column if exists recipe_name,
  drop column if exists cook_time,
  drop column if exists created_at,
  drop column if exists image_url;
