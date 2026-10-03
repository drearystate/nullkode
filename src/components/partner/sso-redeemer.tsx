"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Reads the one-time ticket from the address's #fragment, removes it from
 * the address bar and history, and posts it to /api/partner-sso as a form
 * (the answer is a redirect, which also sets the session cookie).
 */
export function PartnerSsoRedeemer({ missing }: { missing: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [none, setNone] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("t");
    history.replaceState(null, "", window.location.pathname);
    if (t) setTicket(t);
    else setNone(true);
  }, []);

  useEffect(() => {
    if (ticket) form.current?.submit();
  }, [ticket]);

  if (none) return <p role="alert" className="text-sm text-red-200">{missing}</p>;
  return (
    <form ref={form} method="post" action="/api/partner-sso" className="flex justify-center py-4">
      <input type="hidden" name="t" value={ticket ?? ""} />
      <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
    </form>
  );
}
