import { raceFormat, raceTotal, type Race } from '../api';
import { Chibi } from '../components/Chibi';
import { MEMBERS } from '../members';
import { formatTime } from '../time';

export function Home({ races }: { races: Race[] }) {
  // 種目ごとのチームベスト
  const bests = new Map<string, { ms: number; race: Race }>();
  for (const r of races) {
    const t = raceTotal(r);
    const key = raceFormat(r);
    if (t == null || !key) continue;
    const cur = bests.get(key);
    if (!cur || t < cur.ms) bests.set(key, { ms: t, race: r });
  }

  return (
    <>
      <section className="hero">
        <p className="hero-kicker">RELAY RECORDS</p>
        <h1>
          無敵最強<br />スーパーチーター
        </h1>
        <div className="squad">
          {MEMBERS.map((m, i) => (
            <figure key={m.id} className="squad-member" style={{ animationDelay: `${i * 0.12}s` }}>
              <Chibi member={m} size={84} pose={m.role === 'manager' ? 'stand' : 'cheer'} />
              <figcaption>
                {m.name}
                {m.role === 'manager' && <small>マネージャー</small>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <span className="stat-label">出場レース</span>
          <span className="stat-value">{races.length}</span>
        </div>
        {[...bests.entries()].slice(0, 3).map(([fmt, b]) => (
          <a key={fmt} className="stat" href={`#/race/${b.race.id}`}>
            <span className="stat-label">チームベスト {fmt}</span>
            <span className="stat-value mono">{formatTime(b.ms)}</span>
          </a>
        ))}
      </section>

      <section>
        <h2 className="section-title">レース記録</h2>
        {races.length === 0 && <p className="muted">まだ記録がありません。右上の「記録する」から追加しよう。</p>}
        <ul className="race-list">
          {races.map((r) => {
            const t = raceTotal(r);
            const isBest = t != null && bests.get(raceFormat(r))?.race.id === r.id;
            return (
              <li key={r.id}>
                <a href={`#/race/${r.id}`} className="race-card">
                  <div>
                    <div className="race-date">{r.date.replaceAll('-', '.')}</div>
                    <div className="race-title">{r.title}</div>
                    <div className="muted small">
                      {[r.venue, r.eventName, raceFormat(r)].filter(Boolean).join(' / ')}
                    </div>
                  </div>
                  <div className="race-time">
                    {isBest && races.length > 1 && <span className="badge">PB</span>}
                    <span className="mono">{formatTime(t)}</span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
