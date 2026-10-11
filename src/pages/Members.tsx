import type { Race } from '../api';
import { Chibi } from '../components/Chibi';
import { MEMBERS } from '../members';
import { formatTime } from '../time';

export function Members({ races }: { races: Race[] }) {
  return (
    <>
      <h1 className="page-title">メンバー</h1>
      <div className="members">
        {MEMBERS.map((m) => {
          const legs = races.flatMap((r) => r.legs.filter((l) => l.memberId === m.id).map((l) => ({ ...l, race: r })));
          const pbs = new Map<number, { ms: number; raceId: number }>();
          for (const l of legs) {
            if (l.splitMs == null) continue;
            const cur = pbs.get(l.distanceM);
            if (!cur || l.splitMs < cur.ms) pbs.set(l.distanceM, { ms: l.splitMs, raceId: l.race.id });
          }
          const appearances = m.role === 'manager' ? races.length : new Set(legs.map((l) => l.race.id)).size;
          return (
            <section key={m.id} className="member-card" style={{ ['--c' as string]: m.color }}>
              <Chibi member={m} size={96} />
              <div className="member-info">
                <h2>{m.name}</h2>
                <p className="muted small">{m.role === 'manager' ? 'マネージャー' : 'ランナー'} ・ {appearances}大会</p>
                {(m.role === 'runner' || pbs.size > 0) && (
                  <dl className="pbs">
                    {[...pbs.entries()].sort((a, b) => a[0] - b[0]).map(([d, pb]) => (
                      <div key={d}>
                        <dt>{d}m PB</dt>
                        <dd><a href={`#/race/${pb.raceId}`} className="mono">{formatTime(pb.ms)}</a></dd>
                      </div>
                    ))}
                    {pbs.size === 0 && <p className="muted small">まだ記録なし</p>}
                  </dl>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
