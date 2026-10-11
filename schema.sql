-- 無敵最強スーパーチーター リレー記録 DB
DROP TABLE IF EXISTS legs;
DROP TABLE IF EXISTS races;

CREATE TABLE races (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  date            TEXT    NOT NULL,          -- YYYY-MM-DD
  venue           TEXT    NOT NULL DEFAULT '',
  event_name      TEXT    NOT NULL DEFAULT '', -- 例: 4×100mリレー
  total_ms        INTEGER,                   -- 公式記録（無ければ区間合計を表示）
  manager_comment TEXT    NOT NULL DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE legs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  race_id     INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  leg_no      INTEGER NOT NULL,   -- 1走, 2走...
  member_id   TEXT    NOT NULL,   -- src/members.ts の id
  distance_m  INTEGER NOT NULL,
  split_ms    INTEGER,            -- 未計測なら NULL
  UNIQUE (race_id, leg_no)
);

CREATE INDEX idx_legs_race ON legs(race_id);
CREATE INDEX idx_legs_member ON legs(member_id);
