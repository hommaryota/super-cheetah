export type Leg = { legNo: number; memberId: string; distanceM: number; splitMs: number | null };
export type Race = {
  id: number;
  title: string;
  date: string;
  venue: string;
  eventName: string;
  totalMs: number | null;
  managerComment: string;
  legs: Leg[];
};
export type RaceInput = Omit<Race, 'id'>;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { 'content-type': 'application/json' }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  list: () => req<Race[]>('/races'),
  get: (id: number) => req<Race>(`/races/${id}`),
  create: (r: RaceInput) => req<Race>('/races', { method: 'POST', body: JSON.stringify(r) }),
  update: (id: number, r: RaceInput) => req<Race>(`/races/${id}`, { method: 'PUT', body: JSON.stringify(r) }),
  remove: (id: number) => req<void>(`/races/${id}`, { method: 'DELETE' }),
};

// 区間が全部そろっていれば合計、公式記録があればそちらを優先
export function raceTotal(r: Race): number | null {
  if (r.totalMs != null) return r.totalMs;
  if (r.legs.length && r.legs.every((l) => l.splitMs != null)) return r.legs.reduce((s, l) => s + (l.splitMs ?? 0), 0);
  return null;
}

export function raceFormat(r: Race): string {
  const ds = r.legs.map((l) => l.distanceM);
  if (!ds.length) return '';
  return ds.every((d) => d === ds[0]) ? `${ds.length}×${ds[0]}m` : `${ds.join('-')}m`;
}
