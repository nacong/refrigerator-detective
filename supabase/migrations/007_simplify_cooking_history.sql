-- ============================================================
-- 007_simplify_cooking_history.sql
-- cooking_history: user_email, recipe_id, cooked_at 만 유지
-- 나머지 컬럼 삭제
-- ============================================================

alter table public.cooking_history
  drop column if exists recipe_name,
  drop column if exists cook_time,
  drop column if exists created_at,
  drop column if exists image_url;
