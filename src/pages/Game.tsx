import { useEffect, useMemo, useRef, useState } from 'react';
import type { Race } from '../api';
import { Chibi } from '../components/Chibi';
import { MANAGER, RUNNERS, memberById, type Member } from '../members';
import { formatTime } from '../time';

// ───────── 設定 ─────────
const LEG_M = 100;
const LANES = 6;
const RUN_SLOTS = 4; // 走順の5人目はマネージャー枠（走らない）
const SPEED = 5; // 実時間1秒でレース内5秒進む
const DEFAULT_100M = 15000; // 実力タイムが決まっていない人の100m
const PRIOR_WEIGHT = 3; // 実力タイムを記録何回分として扱うか
const BATON_LOSS = 600; // バトンロス・覚醒の期待値（チーム合計）。敵の基準タイム逆算用

// 敵の強さ。total は最速チームのだいたいのチームタイム
const LEVELS = [
  { id: 'beginner', label: '未経験者', total: 65000 },
  { id: 'athletic', label: '運動神経に自信あり', total: 55000 },
  { id: 'experienced', label: '経験者', total: 50000 },
  { id: 'national', label: '全国', total: 45000 },
  { id: 'pro', label: 'プロ', total: 40000 },
  { id: 'world', label: '世界', total: 38000 },
] as const;
type Level = (typeof LEVELS)[number];

const RIVAL_NAMES = ['爆走ペンギンズ', '音速カピバラ', '雷神ハムスター', '疾風ナマケモノ', '閃光タヌキ', '韋駄天アルパカ'];
const RIVAL_COLORS = ['#5aa9e6', '#e3a35b', '#9b7fd1', '#6cbf8b', '#e0707f', '#c9b54a'];

type Event = { at: number; text: string };
type Team = {
  name: string;
  color: string;
  isUs: boolean;
  lane: number;
  runners: Member[];
  splits: number[]; // バトンロス込みの区間タイム
  total: number;
};

// ───────── 乱数まわり ─────────
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // だいたい -1〜1
const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

function rivalRunner(color: string, i: number): Member {
  const styles = ['fluffy', 'spiky', 'side', 'bun', 'pony'] as const;
  return {
    id: `cpu-${color}-${i}`,
    name: 'CPU',
    role: 'runner',
    color,
    look: {
      skin: '#f3d3b9',
      hair: ['#2a2220', '#5a3a28', '#1f1b1a'][i % 3],
      hairStyle: styles[(i * 3 + color.length) % styles.length],
      shirt: color,
      bottom: '#2c2c30',
      headband: false,
    },
  };
}

// 実力タイムと記録帳の 100m 区間タイムを混ぜて基準タイムにする。記録が増えるほど記録寄りになる
function baseOf(races: Race[], memberId: string) {
  const ts = races.flatMap((r) => r.legs).filter((l) => l.memberId === memberId && l.distanceM === LEG_M && l.splitMs != null);
  const sum = ts.reduce((a, l) => a + l.splitMs!, 0);
  return Math.round((traitOf(memberId).base * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + ts.length));
}

// ───────── ステータス ─────────
type Trait = {
  good: string[]; // 画面に出す得意・苦手
  bad: string[];
  base: number; // 実力タイム(100m, ms)
  sway: number; // タイムのブレ幅（基準タイムに対する割合）
  missRate: number; // バトンを受けるときのミス率
  sloppyRate: number; // バトンでちょっともたつく率
  awaken: number; // 覚醒率
  startDash: number; // 1走のときに縮むタイム(ms)
  fall: number; // コケる率
  relaySlow: number; // 2走以降のときのタイム倍率
  slump: number; // 絶不調になる率（1レースごと）
  fade: number; // 後半バテる率
};
const NORMAL: Trait = { good: [], bad: [], base: DEFAULT_100M, relaySlow: 1, slump: 0, fade: 0, sway: 0.04, missRate: 0.08, sloppyRate: 0.32, awaken: 0.07, startDash: 0, fall: 0 };
const TRAITS: Record<string, Trait> = {
  kabukin: {
    ...NORMAL, good: ['スタートダッシュ'], bad: ['バトンを受け取る', '1走以外', '腰痛'],
    base: 13500, startDash: 400, missRate: 0.2, sloppyRate: 0.45, relaySlow: 1.03, slump: 0.1,
  },
  raizap: { ...NORMAL, good: ['タイムが安定'], bad: ['特になし'], base: 14500, sway: 0.012, awaken: 0.03 },
  // 調子に乗る・威嚇・増量期の処理は simulate の中
  nacchan: { ...NORMAL, good: ['調子に乗ると速い', '威嚇'], bad: ['増量期'], base: 16500 },
  // マネージャー枠での声援は simulate の中
  morimoto: { ...NORMAL, good: ['マネージャーで声援'], bad: ['後半バテる'], base: 17000, fade: 0.3 },
  sensei: { ...NORMAL, good: ['ミスが少なく安定'], bad: ['たまにコケる'], base: 12600, sway: 0.02, missRate: 0.02, sloppyRate: 0.15, fall: 0.06 },
};
const traitOf = (id: string): Trait => TRAITS[id] ?? NORMAL;

const NACCHAN_BULK = 0.3; // 増量期の確率（1レースごと）
const NACCHAN_SCARE = 0.2; // 威嚇の確率。成功すると同じ区間の敵が遅くなる
const SLUMP = 1.1; // 絶不調のときのタイム倍率
const CHEER_RATE = 0.35; // 森本さんがマネージャー枠のとき、各区間で声援が効く確率
const HOT_RATE = 0.08; // チーム全員が絶好調になる確率（1レースごと）。たまに52秒台が出るくらい

function simulate(races: Race[], lineup: Member[], level: Level) {
  const order = lineup.slice(0, RUN_SLOTS);
  const cheer = lineup[RUN_SLOTS]?.id === MANAGER.id;
  const events: Event[] = [];
  const lanes = shuffle(Array.from({ length: LANES }, (_, i) => i + 1));

  // speed は 1 未満で速く、1 より大きいと遅くなる
  const runLeg = (base: number, legIdx: number, who: string, tr: Trait, log: boolean, clock: number, speed = 1) => {
    let t = base * speed * (1 + gauss() * tr.sway);
    if (legIdx === 0 && tr.startDash) {
      t -= tr.startDash;
      if (log) events.push({ at: 300, text: `${who}、ロケットスタート！` });
    }
    if (legIdx > 0) {
      const r = Math.random();
      if (r < tr.missRate) {
        t += 1500;
        if (log) events.push({ at: clock, text: `うわっ、${who}バトンミス！` });
      } else if (r < tr.missRate + tr.sloppyRate) {
        t += rand(200, 600);
      } else if (log) {
        events.push({ at: clock, text: `${who}へ完璧なバトンパス！` });
      }
    }
    if (Math.random() < tr.fade) {
      t *= 1.06;
      if (log) events.push({ at: clock + t * 0.6, text: `${who}、後半バテてきた…` });
    }
    if (Math.random() < tr.fall) {
      t += rand(2000, 3000);
      if (log) events.push({ at: clock + t * 0.4, text: `あっ！${who}がコケた！` });
    } else if (Math.random() < tr.awaken) {
      t -= 600;
      if (log) events.push({ at: clock + t * 0.5, text: `${who}が覚醒！神走り！` });
    }
    return Math.round(t);
  };

  // 1チームは難易度どおりの最速、残りは少し遅め（なっちゃんの「調子に乗る」判定に使うので先に決める）
  const legBase = (level.total - BATON_LOSS) / 4;
  const rivals: Team[] = shuffle(RIVAL_NAMES.map((n, i) => [n, RIVAL_COLORS[i]] as const))
    .slice(0, LANES - 1)
    .map(([name, color], k) => {
      const runners = [0, 1, 2, 3].map((i) => rivalRunner(color, i));
      const strength = k === 0 ? 1 : rand(1.02, 1.1);
      const splits: number[] = [];
      let c = 0;
      runners.forEach((_, i) => {
        const s = runLeg(legBase * strength * rand(0.98, 1.02), i, name, NORMAL, false, c);
        splits.push(s);
        c += s;
      });
      return { name, color, isUs: false, lane: lanes[k + 1], runners, splits, total: c };
    });
  const rivalClock = (legs: number) => rivals.map((r) => r.splits.slice(0, legs).reduce((a, b) => a + b, 0));

  const us: Team = { name: '無敵最強スーパーチーター', color: '#f2a316', isUs: true, lane: lanes[0], runners: order, splits: [], total: 0 };
  const bulk = order.some((m) => m.id === 'nacchan') && Math.random() < NACCHAN_BULK;
  if (bulk) events.push({ at: 0, text: 'なっちゃんは今、増量期…' });
  const hot = Math.random() < HOT_RATE;
  if (hot) events.push({ at: 0, text: '今日のチーター、全員絶好調！' });
  const condition = hot ? rand(0.92, 0.95) : 1;
  let clock = 0;
  order.forEach((m, i) => {
    let tr = traitOf(m.id);
    let speed = condition * (i > 0 ? tr.relaySlow : 1);
    if (Math.random() < tr.slump) {
      speed *= SLUMP;
      events.push({ at: clock + 200, text: `${m.name}、腰が…！絶不調…` });
    }
    if (m.id === 'nacchan') {
      if (bulk) {
        speed *= 1.04;
        tr = { ...tr, awaken: 0 };
      } else if (i > 0 && rivalClock(i).every((c) => clock < c)) {
        // トップでバトンを受けると調子に乗る
        speed *= 0.96;
        tr = { ...tr, awaken: 0.25 };
        events.push({ at: clock + 200, text: 'トップで受けたなっちゃん、調子に乗ってきた！' });
      }
    }
    if (cheer && Math.random() < CHEER_RATE) {
      speed *= 0.97;
      events.push({ at: clock + 300, text: `森本さんの声援で${m.name}が加速！` });
    }
    if (m.id === 'nacchan' && Math.random() < NACCHAN_SCARE) {
      // 誰よりも速そうに見せて、同じ区間の相手をビビらせる
      for (const r of rivals) {
        const slow = Math.round(r.splits[i] * rand(0.03, 0.05));
        r.splits[i] += slow;
        r.total += slow;
      }
      events.push({ at: clock + 400, text: 'なっちゃんの威嚇！相手がビビってる！' });
    }
    const s = runLeg(baseOf(races, m.id), i, m.name, tr, true, clock, speed);
    us.splits.push(s);
    clock += s;
  });
  us.total = clock;

  return { teams: [us, ...rivals].sort((a, b) => a.lane - b.lane), events: events.sort((a, b) => a.at - b.at) };
}

// 指定時刻での走者と進み具合
function positionAt(team: Team, t: number) {
  let start = 0;
  for (let i = 0; i < team.splits.length; i++) {
    const end = start + team.splits[i];
    if (t < end) {
      const p = (t - start) / team.splits[i];
      // 1走だけスタート加速っぽく
      return { leg: i, progress: i === 0 ? p * p * 0.35 + p * 0.65 : p, done: false };
    }
    start = end;
  }
  return { leg: team.splits.length - 1, progress: 1, done: true };
}

// プレイ数・優勝数は難易度ごと、ゲームベストは難易度に関係なく1つ
type Stats = { best: number | null; byLevel: Record<string, { plays: number; wins: number }> };
const STATS_KEY = 'super-cheetah-game';
const LEVEL_KEY = 'super-cheetah-game-level';
const loadStats = (): Stats => {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}');
    return { best: raw.best ?? null, byLevel: raw.byLevel ?? {} };
  } catch {
    return { best: null, byLevel: {} };
  }
};
const loadLevel = (): Level => {
  try {
    return LEVELS.find((l) => l.id === localStorage.getItem(LEVEL_KEY)) ?? LEVELS[1];
  } catch {
    return LEVELS[1];
  }
};
const saveStats = (s: Stats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* プライベートモードなどは無視 */
  }
};

type Phase = 'ready' | 'countdown' | 'running' | 'result';

export function Game({ races }: { races: Race[] }) {
  const [order, setOrder] = useState<Member[]>([...RUNNERS, MANAGER]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState('');
  const [level, setLevel] = useState<Level>(loadLevel);
  const [sim, setSim] = useState(() => simulate(races, RUNNERS, level));
  const [t, setT] = useState(0);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [newBest, setNewBest] = useState(false);
  const raf = useRef(0);

  const levelStats = stats.byLevel[level.id] ?? { plays: 0, wins: 0 };

  const chooseLevel = (l: Level) => {
    setLevel(l);
    try {
      localStorage.setItem(LEVEL_KEY, l.id);
    } catch {
      /* プライベートモードなどは無視 */
    }
  };

  const ranking = useMemo(() => [...sim.teams].sort((a, b) => a.total - b.total), [sim]);
  const us = sim.teams.find((tm) => tm.isUs)!;
  const place = ranking.indexOf(us) + 1;
  const liveEvents = phase === 'running' || phase === 'result' ? sim.events.filter((e) => e.at <= t) : [];

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = () => {
    const next = simulate(races, order, level);
    setSim(next);
    setT(0);
    setNewBest(false);
    setPhase('countdown');
    const steps = ['位置について', 'よーい', 'ドン！'];
    steps.forEach((s, i) => setTimeout(() => setCount(s), i * 800));
    setTimeout(() => {
      setCount('');
      setPhase('running');
      const end = Math.max(...next.teams.map((tm) => tm.total));
      const t0 = performance.now();
      const tick = (now: number) => {
        const simT = (now - t0) * SPEED;
        setT(Math.min(simT, end));
        if (simT < end) raf.current = requestAnimationFrame(tick);
        else finish(next.teams, level);
      };
      raf.current = requestAnimationFrame(tick);
    }, steps.length * 800);
  };

  const finish = (teams: Team[], lv: Level) => {
    const mine = teams.find((tm) => tm.isUs)!;
    const won = teams.every((tm) => tm === mine || tm.total >= mine.total);
    const prev = loadStats();
    const isBest = prev.best == null || mine.total < prev.best;
    const cur = prev.byLevel[lv.id] ?? { plays: 0, wins: 0 };
    const next: Stats = {
      best: isBest ? mine.total : prev.best,
      byLevel: { ...prev.byLevel, [lv.id]: { plays: cur.plays + 1, wins: cur.wins + (won ? 1 : 0) } },
    };
    saveStats(next);
    setStats(next);
    setNewBest(isBest);
    setPhase('result');
  };

  const move = (i: number, d: -1 | 1) =>
    setOrder((o) => {
      const j = i + d;
      if (j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const legFastest = (leg: number) => Math.min(...sim.teams.map((tm) => tm.splits[leg]));

  return (
    <div className="game">
      <h1 className="page-title">チーターリレー</h1>
      <p className="muted small">
        100m×4のリレー。メンバーの実力とレース記録をもとに、毎回タイムが上下します。
      </p>

      <div className="game-stats">
        <span>{level.label}で プレイ <b>{levelStats.plays}</b></span>
        <span>優勝 <b>{levelStats.wins}</b></span>
        <span>ゲームベスト <b className="mono">{formatTime(stats.best)}</b></span>
      </div>

      {/* トラック */}
      <div className="track" aria-label="レース画面">
        <div className="track-head">
          <span className="mono clock">{formatTime(t)}</span>
          <span className="leg-marker">{phase === 'running' || phase === 'result' ? `${positionAt(us, t).leg + 1}走 / 4` : 'スタート前'}</span>
        </div>
        {order[RUN_SLOTS] && (
          <div className="cheer" aria-label={`マネージャー ${order[RUN_SLOTS].name}が応援中`}>
            <Chibi member={order[RUN_SLOTS]} size={30} />
          </div>
        )}
        {sim.teams.map((tm) => {
          const pos = phase === 'ready' || phase === 'countdown' ? { leg: 0, progress: 0, done: false } : positionAt(tm, t);
          const runner = tm.runners[pos.leg];
          const rank = pos.done ? ranking.indexOf(tm) + 1 : null;
          return (
            <div key={tm.name} className={`lane ${tm.isUs ? 'us' : ''}`} style={{ ['--c' as string]: tm.color }}>
              <span className="lane-no">{tm.lane}</span>
              <div className="lane-run">
                <div className={`runner ${phase === 'running' && !pos.done ? 'running' : ''}`} style={{ left: `calc(${pos.progress} * (100% - 40px))` }}>
                  <Chibi member={runner} size={34} />
                  {tm.isUs && <span className="runner-name">{runner.name}</span>}
                </div>
              </div>
              <span className="lane-team">{tm.isUs ? 'チーター' : tm.name}</span>
              {rank && <span className={`lane-rank r${rank}`}>{rank}</span>}
            </div>
          );
        })}
        {count && <div className="countdown">{count}</div>}
      </div>

      {/* 実況 */}
      <div className="ticker" aria-live="polite">
        {liveEvents.length ? liveEvents.at(-1)!.text : phase === 'running' ? 'スタート！' : `チーターは第${us.lane}レーン`}
      </div>

      {phase === 'result' && (
        <section className="result">
          <div className={`result-head ${place === 1 ? 'win' : ''}`}>
            <span className="result-place">{place === 1 ? '優勝！' : `${place}位`}</span>
            <span className="mono result-time">{formatTime(us.total)}</span>
            {newBest && <span className="badge">ゲームベスト更新</span>}
          </div>
          <ol className="result-legs">
            {us.runners.map((m, i) => (
              <li key={i}>
                <span className="muted small">{i + 1}走</span>
                <span>{m.name}</span>
                <span className="mono">{formatTime(us.splits[i])}</span>
                {us.splits[i] === legFastest(i) && <span className="badge mvp">区間1位</span>}
              </li>
            ))}
          </ol>
          <ol className="ranking">
            {ranking.map((tm, i) => (
              <li key={tm.name} className={tm.isUs ? 'us' : ''}>
                <span>{i + 1}</span>
                <span>{tm.name}</span>
                <span className="mono">{formatTime(tm.total)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(phase === 'ready' || phase === 'result') && (
        <section className="order">
          <h2 className="section-title">走順</h2>
          <ol className="order-list">
            {order.map((m, i) => (
              <li key={m.id} className={i < RUN_SLOTS ? '' : 'manager-slot'}>
                <span className="muted small">{i < RUN_SLOTS ? `${i + 1}走` : 'マネ'}</span>
                <Chibi member={memberById(m.id)!} size={30} />
                <span className="order-name">
                  {m.name}
                  <span className="traits">
                    {traitOf(m.id).good.map((g) => <span key={g} className="trait good">得意 {g}</span>)}
                    {traitOf(m.id).bad.map((b) => <span key={b} className="trait bad">苦手 {b}</span>)}
                  </span>
                </span>
                <span className="muted small mono">{formatTime(baseOf(races, m.id))}</span>
                <span className="leg-tools">
                  <button type="button" onClick={() => move(i, -1)} aria-label="上へ">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="下へ">↓</button>
                </span>
              </li>
            ))}
          </ol>
          <h2 className="section-title">敵の強さ</h2>
          <div className="levels" role="radiogroup" aria-label="敵の強さ">
            {LEVELS.map((l, i) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={l.id === level.id}
                className={`level ${l.id === level.id ? 'on' : ''}`}
                onClick={() => chooseLevel(l)}
              >
                <span className="level-name">{'①②③④⑤⑥'[i]} {l.label}</span>
                <span className="muted small mono">最速 {Math.round(l.total / 1000)}秒前後</span>
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="btn" onClick={start}>{phase === 'result' ? 'もう一回走る' : 'スタート！'}</button>
            <button className="btn ghost" onClick={() => setOrder((o) => [...shuffle(o.slice(0, RUN_SLOTS)), ...o.slice(RUN_SLOTS)])}>走順ランダム</button>
          </div>
        </section>
      )}
    </div>
  );
}
