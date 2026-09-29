/**
 * Designer wordmark.
 *
 * The platform is white-label, so the wordmark never hard-codes a product
 * name: callers pass the brand the server sends (`name`, optional `logoUrl`).
 * With a logo we show the image; otherwise the brand name as text, followed
 * by "Designer". With no brand yet (still loading) it shows just "Designer".
 */

import { useState } from 'react';

interface WordmarkProps {
  /** Brand name from the server (the reseller's or the platform's). */
  name?: string | null;
  /** Wide logo (data URL or URL) from the server, if the brand has one. */
  logoUrl?: string | null;
  badge?: string;
  size?: 'sm' | 'md' | 'titlebar';
  /** Hide the "Designer" suffix (e.g. on very small screens). */
  compact?: boolean;
}

export function Wordmark({ name, logoUrl, badge, size = 'md', compact = false }: WordmarkProps) {
  const metrics = {
    sm: { height: 24, fontSize: '14px', badgeSize: '8px', gap: '8px' },
    titlebar: { height: 30, fontSize: '17px', badgeSize: '9px', gap: '10px' },
    md: { height: 32, fontSize: '18px', badgeSize: '10px', gap: '10px' },
  }[size];

  const [imgFailed, setImgFailed] = useState(false);
  const brandName = (name ?? '').trim();
  const label = brandName ? `${brandName} Designer` : 'Designer';

  return (
    <span className="inline-flex min-w-0 items-center leading-none" style={{ gap: metrics.gap }}>
      {logoUrl && !imgFailed ? (
        <img
          src={logoUrl}
          alt={label}
          height={metrics.height}
          style={{ height: `${metrics.height}px`, width: 'auto', maxWidth: '160px', display: 'block', objectFit: 'contain' }}
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="truncate"
          title={label}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: metrics.fontSize,
            fontWeight: 750,
            letterSpacing: '0',
            color: 'var(--color-text-primary)',
            lineHeight: 1.1,
          }}
        >
          {brandName || null}
          {compact && brandName ? null : (
            <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              {brandName ? ' Designer' : 'Designer'}
            </span>
          )}
        </span>
      )}
      {badge ? (
        <span
          className="font-medium uppercase leading-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: metrics.badgeSize,
            letterSpacing: '0.12em',
            color: '#64748b',
          }}
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}
