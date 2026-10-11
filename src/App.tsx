import { useCallback, useEffect, useState } from 'react';
import { api, type Race } from './api';
import { Home } from './pages/Home';
import { RaceDetail } from './pages/RaceDetail';
import { RaceForm } from './pages/RaceForm';
import { Members } from './pages/Members';
import { Game } from './pages/Game';
import { go } from './router';

type Route =
  | { name: 'home' }
  | { name: 'race'; id: number }
  | { name: 'new' }
  | { name: 'edit'; id: number }
  | { name: 'members' }
  | { name: 'game' };

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'race' && b) return { name: 'race', id: Number(b) };
  if (a === 'edit' && b) return { name: 'edit', id: Number(b) };
  if (a === 'new') return { name: 'new' };
  if (a === 'members') return { name: 'members' };
  if (a === 'game') return { name: 'game' };
  return { name: 'home' };
}


export function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [races, setRaces] = useState<Race[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.list().then(setRaces).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    reload();
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [reload]);

  const findRace = (id: number) => races?.find((r) => r.id === id);

  // 保存直後に詳細へ遷移できるよう、手元の一覧を先に更新しておく
  const onSaved = (saved: Race) => {
    setRaces((prev) => {
      const rest = (prev ?? []).filter((r) => r.id !== saved.id);
      return [saved, ...rest].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    });
    go(`race/${saved.id}`);
  };

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="logo">
          <span className="logo-mark">⚡</span>無敵最強スーパーチーター
        </a>
        <nav>
          <a href="#/" className={route.name === 'home' ? 'on' : ''}>レース</a>
          <a href="#/members" className={route.name === 'members' ? 'on' : ''}>メンバー</a>
          <a href="#/game" className={route.name === 'game' ? 'on' : ''}>ゲーム</a>
          <a href="#/new" className="btn small">＋ 記録する</a>
        </nav>
      </header>

      <main>
        {error && <p className="error">読み込みに失敗しました：{error}</p>}
        {!races && !error && <p className="muted center">ロード中…</p>}
        {races && route.name === 'home' && <Home races={races} />}
        {races && route.name === 'members' && <Members races={races} />}
        {races && route.name === 'game' && <Game races={races} />}
        {races && route.name === 'race' &&
          (findRace(route.id) ? (
            <RaceDetail race={findRace(route.id)!} races={races} onDeleted={() => { reload(); go(''); }} />
          ) : (
            <p className="muted center">レースが見つかりません</p>
          ))}
        {races && route.name === 'new' && <RaceForm onSaved={onSaved} />}
        {races && route.name === 'edit' && findRace(route.id) && (
          <RaceForm key={route.id} initial={findRace(route.id)} onSaved={onSaved} />
        )}
      </main>

      <footer className="foot">© 無敵最強スーパーチーター</footer>
    </div>
  );
}
