import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { connectionView, getLimits, listConnections } from "@/lib/app-ai/connections";
import { projectAiStatus } from "@/lib/app-ai/status";
import { PROVIDER_IDS, PROVIDERS } from "@/lib/app-ai/providers";
import { AiKeysPanel } from "@/components/app-ai/ai-keys-panel";

export const dynamic = "force-dynamic";

/** The app's own AI keys (docs/ai-in-apps.md). */
export default async function AiKeysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({ where: { id }, select: { id: true, ownerId: true, name: true } });
  if (!project || project.ownerId !== user.id) notFound();
  const [connections, limits, status, t] = await Promise.all([listConnections(id), getLimits(id), projectAiStatus(id), getTranslations("aiKeys")]);
  // Labels come from aiKeys.json; only what the form needs goes to the browser.
  const providers = PROVIDER_IDS.map((pid) => ({ id: pid, baseUrl: PROVIDERS[pid].baseUrl, can: PROVIDERS[pid].can, example: PROVIDERS[pid].example }));
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">{t("page.eyebrow")}</p>
      <h1 className="text-3xl font-semibold tracking-tight" data-help={t("page.introHelp")}>{t("page.title")}</h1>
      <p className="mt-2 text-sm text-surface-400">{t("page.intro")}</p>
      <AiKeysPanel projectId={id} providers={providers} connections={connections.map(connectionView)} status={status} limits={limits} />
    </div>
  );
}
