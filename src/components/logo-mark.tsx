/**
 * The three-bar mark, drawn as vectors (the same bars as the original top-bar
 * logo: 6 wide, 20/28/15 tall, 3 apart, tilted 15°). No background. The
 * first bar takes the operator's brand colour; the lightest bar deepens a
 * little in light mode so it stays visible on white.
 * public/nullkode-mark.svg and public/favicon.svg are the same drawing.
 */
export function LogoMark({ size = 28, className = "", title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="-2.8 -0.45 29 29"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g transform="rotate(-15 12 14)">
        <rect x="0" y="4" width="6" height="20" rx="2" fill="var(--nk-brand-primary, #843dff)" />
        <rect x="9" y="0" width="6" height="28" rx="2" fill="var(--nk-mark-2, #8d66e7)" />
        <rect x="18" y="6.5" width="6" height="15" rx="2" fill="var(--nk-mark-3, #d8c8fa)" />
      </g>
    </svg>
  );
}
