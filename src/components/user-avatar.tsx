/** A person's photo, or their initial on a tinted circle when they haven't added one. */
export function UserAvatar({ name, email, avatarUrl, size = 30, className = "" }: { name: string | null; email: string; avatarUrl?: string | null; size?: number; className?: string }) {
  const initial = (name || email).trim().charAt(0).toUpperCase() || "?";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" width={size} height={size} className={`studio-avatar object-cover ${className}`} style={{ width: size, height: size }} />
    );
  }
  return (
    <span className={`studio-avatar ${className}`} style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }} aria-hidden="true">
      {initial}
    </span>
  );
}
