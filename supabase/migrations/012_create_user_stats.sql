-- 유저 통계 (냉털 횟수 등 게이미피케이션 지표)
CREATE TABLE IF NOT EXISTS user_stats (
  user_email  TEXT        PRIMARY KEY,
  cleared_count INTEGER   NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
