'use client';

const AVATAR_COLORS = [
  '#7c6fff', '#5b8ff9', '#22d3a0', '#f59e0b', '#f87171',
  '#a78bfa', '#34d399', '#60a5fa', '#fb923c', '#e879f9',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = getAvatarColor(name);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${color}22`,
        border: `2px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  );
}
