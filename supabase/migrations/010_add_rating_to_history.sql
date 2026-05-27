-- my_history 테이블에 별점 컬럼 추가 (1~5, nullable)
ALTER TABLE my_history ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
