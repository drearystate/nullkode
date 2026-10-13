import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { KeyRound } from "lucide-react";

/** Dashboard notice: the person's apps that have AI steps but no AI key of their own (docs/ai-in-apps.md). */
export async function AiKeysNotice({ apps }: { apps: Array<{ id: string; name: string }> }) {
  if (!apps.length) return null;
  const t = await getTranslations("aiKeys");
  return (
    <div className="mx-auto max-w-6xl px-5 pt-6" data-testid="ai-keys-dashboard-notice">
      <div role="status" className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
        <p className="flex items-center gap-2 font-medium"><KeyRound size={16} aria-hidden />{t("dashboard.title")}</p>
        <p className="mt-1 text-amber-100/80">{t("dashboard.body")}</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {apps.map((a) => (
            <li key={a.id}><Link className="underline" href={`/projects/${a.id}/ai`}>{t("dashboard.app", { name: a.name })}</Link></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
