import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { localizeRuntimeText, problemsByFlow, type ActivityWords, type FlowProblem } from "@/lib/flow-activity";

type T = Awaited<ReturnType<typeof getTranslations<"project.problemsCard">>>;

/**
 * Plain sentences per flow, e.g. "“Book a table” went through once, but the
 * email wasn't sent because email isn't set up. It also had a problem once:
 * The email server rejected the username or password."
 */
function line(p: FlowProblem, t: T, w: ActivityWords): string {
  const sentences: string[] = [];
  const flow = p.flowName;
  if (p.failed) sentences.push(t("failed", { flow, count: p.failed }));
  if (p.emailOff) sentences.push(sentences.length ? t("emailOffAlso", { count: p.emailOff }) : t("emailOff", { flow, count: p.emailOff }));
  const other = p.warned - p.emailOff;
  if (other > 0) {
    const warning = p.lastWarning && !/email isn't set up/i.test(p.lastWarning) ? localizeRuntimeText(p.lastWarning, w).replace(/[.。\s]+$/, "") : "";
    const first = sentences.length === 0;
    if (warning) sentences.push(first ? t("problemWithWarning", { flow, count: other, warning }) : t("problemAlsoWithWarning", { count: other, warning }));
    else sentences.push(first ? t("problem", { flow, count: other }) : t("problemAlso", { count: other }));
  }
  return sentences.join(" ");
}

/**
 * Problems in the last 24 hours: runs from the app that failed, or finished
 * with a warning (an email that wasn't sent), grouped by flow. Shows nothing
 * when everything went through.
 */
export async function ProblemsCard({ projectId, emailOn, canSetUpEmail }: { projectId: string; emailOn: boolean; canSetUpEmail: boolean }) {
  const problems = await problemsByFlow(projectId).catch((err) => {
    console.error("[problems-card]", err instanceof Error ? err.message : err);
    return [] as FlowProblem[];
  });
  if (!problems.length) return null;
  const t = await getTranslations("project.problemsCard");
  // Stored run errors and warnings are English; the common ones are shown in the owner's language.
  const tf = await getTranslations("flows");
  const w: ActivityWords = { t: (key, values) => tf(key as never, values as never), list: (parts) => parts.join(", ") };
  const total = problems.reduce((n, p) => n + p.failed + p.warned, 0);
  const emailIssue = !emailOn && problems.some((p) => p.emailOff > 0);
  return (
    <section id="problems" className="card mt-6 scroll-mt-24 border-amber-400/25 p-6" aria-labelledby="problems-heading" data-testid="problems-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="problems-heading" className="flex items-center gap-2 font-semibold" data-help={t("titleHelp")}>
          <AlertTriangle size={17} className="text-amber-300" aria-hidden />
          {t("title")}
        </h2>
        <span className="text-xs text-surface-400" data-testid="problems-total">{t("total", { count: total })}</span>
      </div>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {problems.map((p) => (
          <li key={p.flowId} className="py-3" data-testid="problem-line">
            <p className="text-sm text-surface-100">{line(p, t, w)}</p>
            {p.failed > 0 && p.lastError && <p className="mt-1 text-xs text-surface-400">{t("lastError", { error: localizeRuntimeText(p.lastError, w).slice(0, 200) })}</p>}
            <Link href={`/projects/${projectId}/flows/${p.flowId}?tab=activity`} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:underline" data-help={t("activityHelp")}>
              {p.failed ? t("seeWho") : t("seeWhat")}
              <ArrowRight size={12} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {emailIssue && (
        <p className="mt-2 text-xs text-surface-400">
          {t("emailNotSetUp")}{" "}
          {canSetUpEmail ? <Link href="/admin/settings#email" className="text-brand-300 hover:underline" data-help={t("setUpEmailHelp")}>{t("setUpEmail")}</Link> : t("askProvider")}
        </p>
      )}
    </section>
  );
}
