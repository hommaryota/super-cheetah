import { api, raceFormat, raceTotal, type Race } from '../api';
import { Chibi } from '../components/Chibi';
import { MANAGER, memberById, runnerName } from '../members';
import { formatTime, pacePer100 } from '../time';

type Props = { race: Race; races: Race[]; onDeleted: () => void };

export function RaceDetail({ race, races, onDeleted }: Props) {
  const total = raceTotal(race);
  const timed = race.legs.filter((l) => l.splitMs != null);
  const maxSplit = Math.max(...timed.map((l) => l.splitMs!), 1);
  const bestPace = timed.length
    ? Math.min(...timed.map((l) => pacePer100(l.splitMs!, l.distanceM)))
    : null;

  // 個人の過去ベストと比べて自己ベスト更新かどうか
  const isPersonalBest = (memberId: string, distanceM: number, splitMs: number) => {
    const others = races
      .filter((r) => r.id !== race.id && r.date <= race.date)
      .flatMap((r) => r.legs)
      .filter((l) => l.memberId === memberId && l.distanceM === distanceM && l.splitMs != null);
    return others.length > 0 && others.every((l) => splitMs < l.splitMs!);
  };

  const remove = async () => {
    if (!confirm(`「${race.title}」を削除しますか？`)) return;
    await api.remove(race.id);
    onDeleted();
  };

  return (
    <article className="detail">
      <a href="#/" className="back">← レース一覧</a>
      <header className="detail-head">
        <div>
          <div className="race-date">{race.date.replaceAll('-', '.')}</div>
          <h1>{race.title}</h1>
          <p className="muted">{[race.venue, race.eventName, raceFormat(race)].filter(Boolean).join(' / ')}</p>
        </div>
        <div className="total">
          <span className="stat-label">TEAM TIME</span>
          <span className="total-time mono">{formatTime(total)}</span>
          {race.totalMs == null && total != null && <span className="muted small">区間合計</span>}
        </div>
      </header>

      <ol className="legs">
        {race.legs.map((l) => {
          const m = memberById(l.memberId);
          const pace = l.splitMs != null ? pacePer100(l.splitMs, l.distanceM) : null;
          const mvp = pace != null && bestPace != null && timed.length > 1 && pace === bestPace;
          const pb = l.splitMs != null && isPersonalBest(l.memberId, l.distanceM, l.splitMs);
          return (
            <li key={l.legNo} className="leg" style={{ ['--c' as string]: m?.color ?? '#999' }}>
              <div className="leg-no">{l.legNo}走</div>
              <div className="leg-chara">{m && <Chibi member={m} size={52} />}</div>
              <div className="leg-body">
                <div className="leg-name">
                  {runnerName(l.memberId)}
                  <span className="muted small">{l.distanceM}m</span>
                  {mvp && <span className="badge mvp">区間MVP</span>}
                  {pb && <span className="badge">自己ベスト</span>}
                </div>
                <div className="bar">
                  <span style={{ width: l.splitMs ? `${(l.splitMs / maxSplit) * 100}%` : '0%' }} />
                </div>
              </div>
              <div className="leg-time">
                <span className="mono">{formatTime(l.splitMs)}</span>
                {pace != null && l.distanceM !== 100 && <span className="muted small">100m {formatTime(pace)}</span>}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="manager">
        <Chibi member={MANAGER} size={72} />
        <div className="bubble">
          <div className="bubble-name">マネージャー {MANAGER.name}の総評</div>
          <p>{race.managerComment || 'まだコメントがありません。'}</p>
        </div>
      </section>

      <div className="actions">
        <a className="btn" href={`#/edit/${race.id}`}>編集する</a>
        <button className="btn ghost danger" onClick={remove}>削除</button>
      </div>
    </article>
  );
}
