import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkProjectLimit } from "@/lib/guard";
import { billingScopeFor, getPublicPlans } from "@/lib/stripe";
import { aiReady } from "@/lib/ai/client";
import { aiQuotaProblem } from "@/lib/ai-quota";
import { TopBar } from "@/components/top-bar";
import { NewProjectWizard } from "@/components/new-project-wizard";
import { queryString } from "@/lib/app-hosts";
import { withNext } from "@/lib/safe-next";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  // Come back here (with the idea, template or run in the URL) after signing in.
  if (!user) redirect(withNext("/login", `/new${queryString(params)}`));
  const t = await getTranslations("studio.newPage");
  const runId = typeof params.runId === "string" ? params.runId : undefined;
  const [ready, problem, limit] = await Promise.all([aiReady(), aiQuotaProblem(user), checkProjectLimit(user)]);
  // A build that's already running (or just finished) is shown even at the limit.
  const limitMessage = limit && !runId ? ((await limit.json().catch(() => ({}))) as { error?: string }).error || t("limitFallback") : null;

  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user} />
      {limitMessage ? (
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t("limitTitle")}</h1>
          <p className="mt-3 text-sm text-surface-400">{limitMessage}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {(await getPublicPlans(billingScopeFor(user)).catch(() => [])).some((p) => p.key !== "FREE") && <Link href="/billing" className="btn-primary" data-help={t("seePlansHelp")}>{t("seePlans")}</Link>}
            <Link href="/dashboard" className="btn-ghost">{t("backToApps")}</Link>
          </div>
        </div>
      ) : (
        <NewProjectWizard aiReady={ready} aiProblem={problem} isAdmin={user.role === "ADMIN"} />
      )}
    </main>
  );
}
