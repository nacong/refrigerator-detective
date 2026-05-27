-- db_recipes.id 컬럼에 auto-increment 시퀀스 추가
-- (id 컬럼에 DEFAULT 값이 없어서 AI 레시피 INSERT 시 null 오류 발생)

CREATE SEQUENCE IF NOT EXISTS db_recipes_id_seq;

-- 기존 최대 id 이후부터 시퀀스 시작 (기존 데이터와 충돌 방지)
SELECT setval(
  'db_recipes_id_seq',
  COALESCE((SELECT MAX(id) FROM db_recipes), 0) + 1,
  false
);

-- id 컬럼의 DEFAULT를 시퀀스로 설정
ALTER TABLE db_recipes
  ALTER COLUMN id SET DEFAULT nextval('db_recipes_id_seq');
