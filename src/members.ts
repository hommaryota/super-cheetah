export type HairStyle = 'fluffy' | 'spiky' | 'bun' | 'side' | 'pony';

export type Look = {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  bottom: string;
  leggings?: boolean;
  headband: boolean;
  collar?: boolean;
  extra?: 'staff' | 'armband' | 'clipboard';
};

export type Member = {
  id: string;
  name: string;
  role: 'runner' | 'manager';
  color: string; // チャートなどで使う個人カラー
  look: Look;
};

// 2026 リレーフェスティバルの写真をもとにデフォルメ
export const MEMBERS: Member[] = [
  {
    id: 'kabukin', name: 'かぶきん', role: 'runner', color: '#e8892b',
    look: { skin: '#f7d9c2', hair: '#1f1b1a', hairStyle: 'fluffy', shirt: '#f7f4ee', bottom: '#232326', headband: true, extra: 'staff' },
  },
  {
    id: 'raizap', name: 'らいざっぷ', role: 'runner', color: '#3f7fc8',
    look: { skin: '#f5d4ba', hair: '#1f1b1a', hairStyle: 'spiky', shirt: '#26262a', bottom: '#26262a', headband: true },
  },
  {
    id: 'nacchan', name: 'なっちゃん', role: 'runner', color: '#d9577a',
    look: { skin: '#f8dcc7', hair: '#3a2a22', hairStyle: 'bun', shirt: '#26262a', bottom: '#1b1b1d', leggings: true, headband: true },
  },
  {
    id: 'sensei', name: '先生', role: 'runner', color: '#3e9a6a',
    look: { skin: '#ecc3a0', hair: '#24201e', hairStyle: 'side', shirt: '#25406b', bottom: '#a3a8ae', headband: false, collar: true, extra: 'armband' },
  },
  {
    id: 'morimoto', name: '森本さん', role: 'manager', color: '#8b6cc4',
    look: { skin: '#f8dcc7', hair: '#4a3328', hairStyle: 'pony', shirt: '#f7f4ee', bottom: '#2b2b2e', headband: true, extra: 'clipboard' },
  },
];

export const RUNNERS = MEMBERS.filter((m) => m.role === 'runner');
export const MANAGER = MEMBERS.find((m) => m.role === 'manager')!;
export const memberById = (id: string) => MEMBERS.find((m) => m.id === id);

// メンバー以外が走ったときは member_id に 'guest:名前' を入れる
const GUEST_PREFIX = 'guest:';
export const guestId = (name: string) => GUEST_PREFIX + name.trim();
export const guestName = (id: string) => (id.startsWith(GUEST_PREFIX) ? id.slice(GUEST_PREFIX.length) : null);
export const runnerName = (id: string) => memberById(id)?.name ?? guestName(id) ?? id;
