import { useState } from 'react';
import { api, type Race } from '../api';
import { MEMBERS, RUNNERS, guestId, guestName } from '../members';
import { formatTime, parseTime } from '../time';

// memberId が GUEST のときは guest に入力された名前で登録する
const GUEST = '__guest__';
type LegDraft = { memberId: string; guest: string; distanceM: string; split: string };

const today = () => new Date().toLocaleDateString('sv-SE');

export function RaceForm({ initial, onSaved }: { initial?: Race; onSaved: (r: Race) => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? today());
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [eventName, setEventName] = useState(initial?.eventName ?? '');
  const [total, setTotal] = useState(initial?.totalMs != null ? formatTime(initial.totalMs) : '');
  const [comment, setComment] = useState(initial?.managerComment ?? '');
  const [legs, setLegs] = useState<LegDraft[]>(
    initial?.legs.map((l) => ({
      memberId: guestName(l.memberId) != null ? GUEST : l.memberId,
      guest: guestName(l.memberId) ?? '',
      distanceM: String(l.distanceM),
      split: l.splitMs != null ? formatTime(l.splitMs) : '',
    })) ?? RUNNERS.map((m) => ({ memberId: m.id, guest: '', distanceM: '100', split: '' })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setLeg = (i: number, patch: Partial<LegDraft>) =>
    setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: -1 | 1) =>
    setLegs((ls) => {
      const j = i + d;
      if (j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const parsedSplits = legs.map((l) => parseTime(l.split));
  const sum = parsedSplits.every((s) => s != null && !Number.isNaN(s))
    ? parsedSplits.reduce<number>((a, b) => a + (b ?? 0), 0)
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const totalMs = parseTime(total);
    if (Number.isNaN(totalMs)) return setError('チームタイムの形式が正しくありません（例: 52.31 / 1:45.20）');
    if (parsedSplits.some((s) => Number.isNaN(s))) return setError('区間タイムの形式が正しくありません（例: 12.34）');
    if (legs.some((l) => !(Number(l.distanceM) > 0))) return setError('距離を入力してください');
    if (legs.some((l) => l.memberId === GUEST && !l.guest.trim())) return setError('走った人の名前を入力してください');

    const body = {
      title, date, venue, eventName,
      totalMs,
      managerComment: comment,
      legs: legs.map((l, i) => ({
        legNo: i + 1,
        memberId: l.memberId === GUEST ? guestId(l.guest) : l.memberId,
        distanceM: Math.round(Number(l.distanceM)),
        splitMs: parsedSplits[i],
      })),
    };
    setSaving(true);
    try {
      const saved = initial ? await api.update(initial.id, body) : await api.create(body);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <a href={initial ? `#/race/${initial.id}` : '#/'} className="back">← 戻る</a>
      <h1>{initial ? 'レースを編集' : 'レースを記録'}</h1>

      <div className="grid2">
        <label>大会名<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="リレーフェスティバル2026" /></label>
        <label>日付<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>会場<input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="国立競技場" /></label>
        <label>種目<input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="4×100mリレー" /></label>
      </div>

      <h2 className="section-title">走順と区間タイム</h2>
      <ol className="leg-inputs">
        {legs.map((l, i) => (
          <li key={i}>
            <span className="leg-no">{i + 1}走</span>
            <select value={l.memberId} onChange={(e) => setLeg(i, { memberId: e.target.value })}>
              {MEMBERS.map((m) => (
                <option key={m.id} value={m.id}>{m.role === 'manager' ? `${m.name}（マネージャー）` : m.name}</option>
              ))}
              <option value={GUEST}>その他（名前を入力）</option>
            </select>
            {l.memberId === GUEST && (
              <input className="w-guest" value={l.guest} onChange={(e) => setLeg(i, { guest: e.target.value })} placeholder="名前" maxLength={20} aria-label="走った人の名前" />
            )}
            <input className="w-dist" inputMode="numeric" value={l.distanceM} onChange={(e) => setLeg(i, { distanceM: e.target.value })} aria-label="距離(m)" />
            <span className="muted small">m</span>
            <input className="w-time mono" inputMode="decimal" value={l.split} onChange={(e) => setLeg(i, { split: e.target.value })} placeholder="12.34" aria-label="区間タイム" />
            <span className="leg-tools">
              <button type="button" onClick={() => move(i, -1)} aria-label="上へ">↑</button>
              <button type="button" onClick={() => move(i, 1)} aria-label="下へ">↓</button>
              <button type="button" onClick={() => setLegs((ls) => ls.filter((_, j) => j !== i))} disabled={legs.length <= 1} aria-label="削除">×</button>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn ghost small" onClick={() => setLegs((ls) => [...ls, { memberId: RUNNERS[0].id, guest: '', distanceM: ls.at(-1)?.distanceM ?? '100', split: '' }])}>
        ＋ 区間を追加
      </button>

      <div className="grid2">
        <label>
          チームタイム（公式記録）
          <input className="mono" value={total} onChange={(e) => setTotal(e.target.value)} placeholder={sum != null ? `空欄なら区間合計 ${formatTime(sum)}` : '52.31'} />
        </label>
      </div>

      <label>マネージャー森本さんの総評<textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="バトンパスは過去イチ！" /></label>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn" disabled={saving}>{saving ? '保存中…' : '保存する'}</button>
      </div>
    </form>
  );
}
