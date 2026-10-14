"use client";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

type Kind = "app" | "design" | "game";

const INCLUDES: Record<Kind, string[]> = {
  app: ["pages", "flows", "tables", "data", "look", "phone", "media"],
  design: ["files", "app"],
  game: ["files", "plan", "version"],
};

const NEVER: Record<Kind, string[]> = {
  app: ["aiKeys", "payment", "databases", "signing", "domains", "push", "secrets", "published", "people", "owner"],
  design: ["aiKeys", "payment", "domains", "published", "chat"],
  game: ["chat", "gameApp", "aiKeys", "domains", "signing"],
};

/** What a copy of an app, design or game includes and what it never includes (the Share dialog and the copy page). */
export function CopyContents({ kind, includeData = true, titles }: { kind: Kind; includeData?: boolean; titles?: { includes: string; never: string } }) {
  const t = useTranslations("sharing");
  const includes = INCLUDES[kind].filter((k) => !(kind === "app" && k === "data" && !includeData));
  return <div className="grid gap-4 sm:grid-cols-2" data-testid="copy-contents">
    <section>
      <h3 className="text-sm font-semibold">{titles?.includes ?? t("copy.includesTitle")}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-surface-300">{includes.map((k) => <li key={k} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden /><span>{t(`includes.${kind}.${k}`)}</span></li>)}</ul>
    </section>
    <section>
      <h3 className="text-sm font-semibold">{titles?.never ?? t("copy.neverTitle")}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-surface-300" data-testid="copy-never">{NEVER[kind].map((k) => <li key={k} className="flex items-start gap-2"><X size={14} className="mt-0.5 shrink-0 text-red-300" aria-hidden /><span>{t(`never.${k}`)}</span></li>)}</ul>
    </section>
  </div>;
}
