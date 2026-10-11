-- 2026/10/11 リレーフェスティバル2026（タイムと走順はアプリから編集してください）
INSERT INTO races (id, title, date, venue, event_name, total_ms, manager_comment)
VALUES (1, 'リレーフェスティバル2026', '2026-10-11', 'MUFGスタジアム（国立競技場）', 'リレー', NULL, '');

INSERT INTO legs (race_id, leg_no, member_id, distance_m, split_ms) VALUES
  (1, 1, 'kabukin', 100, NULL),
  (1, 2, 'raizap',  100, NULL),
  (1, 3, 'nacchan', 100, NULL),
  (1, 4, 'sensei',  100, NULL);
