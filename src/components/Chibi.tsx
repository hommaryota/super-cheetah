import type { Look, Member } from '../members';

const INK = '#2a2420';

function HairBack({ look }: { look: Look }) {
  if (look.hairStyle === 'pony')
    return <path d="M84 40 C104 44 108 70 96 92 C94 76 90 62 82 54 Z" fill={look.hair} stroke={INK} strokeWidth={2} />;
  if (look.hairStyle === 'bun')
    return <circle cx={60} cy={13} r={11} fill={look.hair} stroke={INK} strokeWidth={2} />;
  return null;
}

function HairFront({ look }: { look: Look }) {
  const c = look.hair;
  const p = { fill: c, stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const };
  switch (look.hairStyle) {
    case 'fluffy':
      return <path {...p} d="M27 50 C22 22 44 9 62 11 C84 12 99 28 93 52 C88 41 82 37 76 39 C72 32 64 31 58 36 C52 31 43 33 40 40 C35 39 30 43 27 50 Z" />;
    case 'spiky':
      return <path {...p} d="M27 50 C25 30 32 18 40 15 L42 7 L50 13 L58 4 L64 12 L74 6 L76 15 C88 19 97 32 93 50 C86 40 76 36 66 38 C58 34 46 34 38 40 C33 42 29 45 27 50 Z" />;
    case 'side':
      return <path {...p} d="M27 52 C23 26 42 12 62 12 C82 12 98 26 93 50 C89 40 80 33 68 32 C76 38 76 42 74 44 C60 40 50 38 40 42 C34 44 30 47 27 52 Z" />;
    case 'bun':
    case 'pony':
      return <path {...p} d="M27 54 C23 26 42 14 60 14 C80 14 98 28 93 54 C90 44 84 38 78 36 C70 40 58 38 52 34 C46 38 38 40 33 44 C30 47 28 50 27 54 Z" />;
  }
}

export function Chibi({ member, size = 96, pose = 'stand' }: { member: Member; size?: number; pose?: 'stand' | 'cheer' }) {
  const L = member.look;
  const isManager = member.role === 'manager';
  const armL = pose === 'cheer' ? 'M43 86 L28 66' : 'M43 86 L34 104';
  const handL = pose === 'cheer' ? [27, 63] : [33, 107];

  return (
    <svg viewBox="0 0 120 150" width={size} height={size * 1.25} role="img" aria-label={member.name}>
      <ellipse cx={60} cy={145} rx={28} ry={4} fill="#000" opacity={0.12} />
      {/* 脚 */}
      <rect x={48} y={110} width={10} height={30} rx={4} fill={L.leggings ? L.bottom : L.skin} stroke={INK} strokeWidth={2} />
      <rect x={62} y={110} width={10} height={30} rx={4} fill={L.leggings ? L.bottom : L.skin} stroke={INK} strokeWidth={2} />
      <ellipse cx={52} cy={141} rx={8} ry={4} fill="#3b3b40" stroke={INK} strokeWidth={2} />
      <ellipse cx={68} cy={141} rx={8} ry={4} fill="#3b3b40" stroke={INK} strokeWidth={2} />
      {/* ボトム */}
      <rect x={43} y={102} width={34} height={16} rx={5} fill={L.bottom} stroke={INK} strokeWidth={2} />
      {/* 腕 */}
      <path d={armL} stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <path d={armL} stroke={L.shirt} strokeWidth={7} strokeLinecap="round" />
      <circle cx={handL[0]} cy={handL[1]} r={5} fill={L.skin} stroke={INK} strokeWidth={2} />
      <path d="M77 86 L86 104" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <path d="M77 86 L86 104" stroke={L.shirt} strokeWidth={7} strokeLinecap="round" />
      <circle cx={87} cy={107} r={5} fill={L.skin} stroke={INK} strokeWidth={2} />
      {L.extra === 'armband' && <path d="M80 92 L84 99" stroke="#1d1d22" strokeWidth={8} />}
      {/* 胴 */}
      <rect x={40} y={76} width={40} height={34} rx={12} fill={L.shirt} stroke={INK} strokeWidth={2} />
      {L.collar && <path d="M50 77 L60 86 L70 77" fill="none" stroke="#18304f" strokeWidth={3} strokeLinejoin="round" />}
      {/* ゼッケン or マネージャー札 */}
      {isManager ? (
        <g>
          <rect x={49} y={88} width={22} height={13} rx={3} fill="#c99a3a" stroke={INK} strokeWidth={1.5} />
          <text x={60} y={97.5} fontSize={7} fontWeight={800} textAnchor="middle" fill="#fff">MGR</text>
        </g>
      ) : (
        <g>
          <rect x={46} y={86} width={28} height={17} rx={2} fill="#fff" stroke={INK} strokeWidth={1.5} />
          <rect x={46} y={86} width={28} height={4} fill="#ef7d1f" />
          <text x={60} y={99} fontSize={7} fontWeight={800} textAnchor="middle" fill={INK}>無敵</text>
        </g>
      )}
      {L.extra === 'staff' && <rect x={73} y={80} width={6} height={9} rx={1} fill="#f2b04a" stroke={INK} strokeWidth={1} />}
      {/* 頭 */}
      <HairBack look={L} />
      <circle cx={28} cy={54} r={5} fill={L.skin} stroke={INK} strokeWidth={2} />
      <circle cx={92} cy={54} r={5} fill={L.skin} stroke={INK} strokeWidth={2} />
      <circle cx={60} cy={48} r={32} fill={L.skin} stroke={INK} strokeWidth={2} />
      <HairFront look={L} />
      {/* ハチマキ（チーター柄プレート） */}
      {L.headband && (
        <g>
          <path d="M28 38 Q60 30 92 38 L92 47 Q60 39 28 47 Z" fill="#3c3f45" stroke={INK} strokeWidth={1.5} />
          <rect x={47} y={31} width={26} height={12} rx={2} fill="#c3c8cf" stroke="#7d838b" strokeWidth={1.5} />
          <circle cx={54} cy={37} r={1.8} fill="#3c3f45" />
          <circle cx={60} cy={35.5} r={1.5} fill="#3c3f45" />
          <circle cx={66} cy={37.5} r={1.8} fill="#3c3f45" />
        </g>
      )}
      {/* 顔 */}
      <ellipse cx={48} cy={57} rx={3.4} ry={4.4} fill={INK} />
      <ellipse cx={72} cy={57} rx={3.4} ry={4.4} fill={INK} />
      <circle cx={49.2} cy={55.4} r={1.2} fill="#fff" />
      <circle cx={73.2} cy={55.4} r={1.2} fill="#fff" />
      <ellipse cx={41} cy={65} rx={5} ry={2.8} fill="#f29b9b" opacity={0.55} />
      <ellipse cx={79} cy={65} rx={5} ry={2.8} fill="#f29b9b" opacity={0.55} />
      <path d="M53 66 Q60 73 67 66" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      {/* クリップボード＋ストップウォッチ */}
      {L.extra === 'clipboard' && (
        <g>
          <rect x={84} y={96} width={18} height={22} rx={2} fill="#d9b88a" stroke={INK} strokeWidth={1.5} />
          <rect x={87} y={100} width={12} height={15} fill="#fff" />
          <path d="M89 104 H97 M89 108 H97 M89 112 H94" stroke="#999" strokeWidth={1} />
          <circle cx={28} cy={112} r={6} fill="#e9e9ec" stroke={INK} strokeWidth={1.5} />
          <path d="M28 112 L28 108.5" stroke={INK} strokeWidth={1.2} />
        </g>
      )}
    </svg>
  );
}
