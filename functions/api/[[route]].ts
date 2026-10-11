// Cloudflare Pages Functions: /api/* をまとめて処理
interface Env {
  DB: D1Database;
}

type LegInput = { legNo: number; memberId: string; distanceM: number; splitMs: number | null };
type RaceInput = {
  title: string;
  date: string;
  venue?: string;
  eventName?: string;
  totalMs?: number | null;
  managerComment?: string;
  legs: LegInput[];
};

type RaceRow = {
  id: number; title: string; date: string; venue: string; event_name: string;
  total_ms: number | null; manager_comment: string;
};
type LegRow = { race_id: number; leg_no: number; member_id: string; distance_m: number; split_ms: number | null };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const toRace = (r: RaceRow, legs: LegRow[]) => ({
  id: r.id,
  title: r.title,
  date: r.date,
  venue: r.venue,
  eventName: r.event_name,
  totalMs: r.total_ms,
  managerComment: r.manager_comment,
  legs: legs
    .filter((l) => l.race_id === r.id)
    .sort((a, b) => a.leg_no - b.leg_no)
    .map((l) => ({ legNo: l.leg_no, memberId: l.member_id, distanceM: l.distance_m, splitMs: l.split_ms })),
});

function validate(body: unknown): RaceInput | string {
  const b = body as RaceInput;
  if (!b || typeof b.title !== 'string' || !b.title.trim()) return 'title は必須です';
  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return 'date は YYYY-MM-DD 形式で';
  if (!Array.isArray(b.legs) || b.legs.length === 0 || b.legs.length > 20) return 'legs は1〜20件';
  for (const l of b.legs) {
    if (typeof l.memberId !== 'string' || !l.memberId || l.memberId.length > 40) return 'memberId が不正です';
    if (l.memberId.startsWith('guest:') && !l.memberId.slice(6).trim()) return '走った人の名前を入力してください';
    if (!Number.isInteger(l.distanceM) || l.distanceM <= 0) return 'distanceM が不正です';
    if (l.splitMs !== null && (!Number.isInteger(l.splitMs) || l.splitMs <= 0)) return 'splitMs が不正です';
  }
  if (b.totalMs != null && (!Number.isInteger(b.totalMs) || b.totalMs <= 0)) return 'totalMs が不正です';
  return b;
}

async function getRace(db: D1Database, id: number) {
  const race = await db.prepare('SELECT * FROM races WHERE id = ?').bind(id).first<RaceRow>();
  if (!race) return null;
  const { results } = await db.prepare('SELECT * FROM legs WHERE race_id = ?').bind(id).all<LegRow>();
  return toRace(race, results);
}

function legStatements(db: D1Database, raceId: number, legs: LegInput[]) {
  const stmt = db.prepare(
    'INSERT INTO legs (race_id, leg_no, member_id, distance_m, split_ms) VALUES (?, ?, ?, ?, ?)',
  );
  return legs.map((l, i) => stmt.bind(raceId, i + 1, l.memberId, l.distanceM, l.splitMs));
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const db = env.DB;

  try {
    if (parts[0] !== 'races') return json({ error: 'not found' }, 404);
    const id = parts[1] ? Number(parts[1]) : null;
    if (parts[1] && !Number.isInteger(id)) return json({ error: 'bad id' }, 400);

    // 一覧
    if (!id && request.method === 'GET') {
      const races = await db.prepare('SELECT * FROM races ORDER BY date DESC, id DESC').all<RaceRow>();
      const legs = await db.prepare('SELECT * FROM legs').all<LegRow>();
      return json(races.results.map((r) => toRace(r, legs.results)));
    }

    // 作成
    if (!id && request.method === 'POST') {
      const v = validate(await request.json());
      if (typeof v === 'string') return json({ error: v }, 400);
      const created = await db
        .prepare(
          'INSERT INTO races (title, date, venue, event_name, total_ms, manager_comment) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
        )
        .bind(v.title.trim(), v.date, v.venue ?? '', v.eventName ?? '', v.totalMs ?? null, v.managerComment ?? '')
        .first<{ id: number }>();
      if (!created) return json({ error: 'insert failed' }, 500);
      await db.batch(legStatements(db, created.id, v.legs));
      return json(await getRace(db, created.id), 201);
    }

    if (id && request.method === 'GET') {
      const race = await getRace(db, id);
      return race ? json(race) : json({ error: 'not found' }, 404);
    }

    // 更新（区間は丸ごと入れ替え）
    if (id && request.method === 'PUT') {
      const v = validate(await request.json());
      if (typeof v === 'string') return json({ error: v }, 400);
      await db.batch([
        db
          .prepare(
            'UPDATE races SET title = ?, date = ?, venue = ?, event_name = ?, total_ms = ?, manager_comment = ? WHERE id = ?',
          )
          .bind(v.title.trim(), v.date, v.venue ?? '', v.eventName ?? '', v.totalMs ?? null, v.managerComment ?? '', id),
        db.prepare('DELETE FROM legs WHERE race_id = ?').bind(id),
        ...legStatements(db, id, v.legs),
      ]);
      const race = await getRace(db, id);
      return race ? json(race) : json({ error: 'not found' }, 404);
    }

    if (id && request.method === 'DELETE') {
      await db.batch([
        db.prepare('DELETE FROM legs WHERE race_id = ?').bind(id),
        db.prepare('DELETE FROM races WHERE id = ?').bind(id),
      ]);
      return new Response(null, { status: 204 });
    }

    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'server error' }, 500);
  }
};
