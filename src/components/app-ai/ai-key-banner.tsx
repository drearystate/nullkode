"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";

/**
 * Shown on every screen of an app (the editor included) that has AI steps
 * but no AI key of its own, unless its owner is the platform owner
 * (docs/ai-in-apps.md). Not on the AI keys screen itself.
 */
export function AiKeyBanner({ projectId }: { projectId: string }) {
  const t = useTranslations("aiKeys");
  const pathname = usePathname() ?? "";
  if (pathname.endsWith(`/projects/${projectId}/ai`)) return null;
  return (
    <div role="status" data-testid="ai-key-banner" className="border-b border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
        <TriangleAlert size={15} className="shrink-0" aria-hidden />
        <span className="font-medium">{t("banner.title")}</span>
        <span className="text-amber-100/80">{t("banner.body")}</span>
        <Link href={`/projects/${projectId}/ai`} className="ms-auto shrink-0 font-medium underline">{t("banner.cta")}</Link>
      </div>
    </div>
  );
}
