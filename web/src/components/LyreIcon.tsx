interface LyreIconProps {
  size?: number;
  className?: string;
}

export default function LyreIcon({ size = 24, className = '' }: LyreIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Lyre body - U shape */}
      <path d="M6 20 C6 14, 6 10, 6 8 C6 5, 8 3, 12 3 C16 3, 18 5, 18 8 C18 10, 18 14, 18 20" />

      {/* Cross bar at top */}
      <line x1="6" y1="8" x2="18" y2="8" />

      {/* Strings */}
      <line x1="8" y1="8" x2="8" y2="20" opacity="0.6" />
      <line x1="12" y1="8" x2="12" y2="20" opacity="0.6" />
      <line x1="16" y1="8" x2="16" y2="20" opacity="0.6" />

      {/* Base */}
      <line x1="4" y1="20" x2="20" y2="20" strokeWidth="2.5" />

      {/* Decorative curves at top */}
      <path d="M6 8 C6 6, 5 4, 4 3" strokeWidth="1.5" />
      <path d="M18 8 C18 6, 19 4, 20 3" strokeWidth="1.5" />
    </svg>
  );
}
