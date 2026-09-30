import { LogoMark } from "./logo-mark";

/** The platform's mark (three bars) and name, as in the studio's top bar. */
export function BrandWordmark({ name, className = "", markSize = 28 }: { name: string; className?: string; markSize?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={markSize} />
      <span>{name}<span className="text-brand-400">.</span></span>
    </span>
  );
}
