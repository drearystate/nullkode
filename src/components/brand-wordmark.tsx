/** The platform's mark (three bars) and name, as in the studio's top bar. */
export function BrandWordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="studio-logo-mark" aria-hidden="true"><span /><span /><span /></span>
      <span>{name}<span className="text-brand-400">.</span></span>
    </span>
  );
}
