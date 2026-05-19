-- ============================================================
-- 006_recipes_catalog.sql
-- recipes 테이블: steps, cooking_method 컬럼 추가
-- (실제 DB에 user_email 컬럼이 없어 nullable 변경은 불필요)
-- ============================================================

alter table public.recipes
  add column if not exists steps text[] not null default '{}';

alter table public.recipes
  add column if not exists cooking_method text not null default '';
