-- ============================================================
-- 008_recipe_from_photo_url.sql
-- db_recipes: 레시피 출처(recipe_from) 추가 — 기본값 '만개의 레시피', AI 생성 시 'AI'
-- my_history : db_recipe_id (db_recipes 참조), photo_url (사용자 완성 사진)
-- ============================================================

-- 레시피 출처 컬럼
ALTER TABLE db_recipes
  ADD COLUMN IF NOT EXISTS recipe_from TEXT NOT NULL DEFAULT '만개의 레시피';

-- my_history 에서 db_recipes.id 참조 컬럼 (신규)
ALTER TABLE my_history
  ADD COLUMN IF NOT EXISTS db_recipe_id INTEGER;

-- 사용자 완성 사진 URL
ALTER TABLE my_history
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
