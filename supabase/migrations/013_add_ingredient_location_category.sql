-- 식재료에 보관 위치 및 카테고리 컬럼 추가
ALTER TABLE my_ingredients
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '냉장실',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '기타';
