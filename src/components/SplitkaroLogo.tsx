import Link from 'next/link';

type SplitkaroLogoProps = {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
};

const sizes = {
  sm: { mark: 34, text: 16 },
  md: { mark: 42, text: 20 },
  lg: { mark: 56, text: 28 },
};

function LogoContent({ size = 'md', showWordmark = true }: Omit<SplitkaroLogoProps, 'href'>) {
  const selected = sizes[size];

  return (
    <span className="splitkaro-logo" style={{ gap: size === 'lg' ? 12 : 10 }}>
      <span
        className="splitkaro-logo-mark"
        style={{ width: selected.mark, height: selected.mark, borderRadius: Math.max(10, selected.mark * 0.28) }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 48" role="img" focusable="false">
          <rect x="8" y="10" width="21" height="25" rx="6" className="logo-bill logo-bill-left" />
          <rect x="19" y="13" width="21" height="25" rx="6" className="logo-bill logo-bill-right" />
          <path d="M15 31 C21 20 27 38 34 17" className="logo-flow" />
          <circle cx="15" cy="31" r="2.8" className="logo-dot" />
          <circle cx="34" cy="17" r="2.8" className="logo-dot" />
        </svg>
      </span>
      {showWordmark && (
        <span className="splitkaro-wordmark" style={{ fontSize: selected.text }}>
          splitkaro
        </span>
      )}
    </span>
  );
}

export function SplitkaroLogo({ href, size = 'md', showWordmark = true }: SplitkaroLogoProps) {
  if (!href) {
    return <LogoContent size={size} showWordmark={showWordmark} />;
  }

  return (
    <Link href={href} className="splitkaro-logo-link" aria-label="splitkaro home">
      <LogoContent size={size} showWordmark={showWordmark} />
    </Link>
  );
}
