import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, GitBranch, Workflow } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NewFlowButton } from "@/components/new-flow-button";
import { FlowEnabledSwitch } from "@/components/flow/flow-enabled-switch";

export default async function FlowsList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({ where: { id }, include: { flows: { orderBy: { updatedAt: "desc" } } } });
  if (!project || project.ownerId !== user.id) notFound();
  const t = await getTranslations("flows.list");
  return <div className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="studio-eyebrow mb-3 text-brand-300">{t("eyebrow")}</p><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-400">{t("intro")}</p></div><NewFlowButton projectId={id} /></div>
    <div className="studio-flow-explainer" data-help={t("explainerHelp")}><span><span className="studio-method-icon"><Workflow size={19} /></span>{t("somethingHappens")}</span><ArrowRight size={16} className="rtl:-scale-x-100" /><span><span className="studio-method-icon"><GitBranch size={19} /></span>{t("stepsRun")}</span><ArrowRight size={16} className="rtl:-scale-x-100" /><span>{t("result")}</span></div>
    <div className="mt-7 grid grid-cols-1 gap-3">{project.flows.length === 0 ? <div className="studio-empty"><GitBranch size={30} className="text-brand-300" /><h2 className="mt-4 font-semibold">{t("emptyTitle")}</h2><p className="mt-2 max-w-md text-sm text-surface-400">{t("emptyBody")}</p><Link href={`/projects/${id}/modules`} className="btn-ghost mt-5" data-help={t("exploreHelp")}>{t("explore")} <ArrowRight size={14} className="rtl:-scale-x-100" /></Link></div> : project.flows.map((f) => {
      const graph = f.graph as { nodes?: unknown[]; edges?: unknown[] };
      const href = `/projects/${id}/flows/${f.id}`;
      return <div key={f.id} className="studio-flow-card"><Link href={href} className="flex min-w-0 flex-1 items-center gap-[18px]" data-help={t("openHelp")}><span className="studio-method-icon"><GitBranch size={19} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-medium">{f.name}</h2><p className="mt-1 text-xs text-surface-400">{f.trigger === "SCHEDULE" ? t("triggerSchedule") : f.trigger === "FORM_SUBMIT" ? t("triggerForm") : f.trigger === "EVENT" ? t("triggerEvent") : t("triggerRequest")}<span className="mx-2 text-surface-600">·</span>{t("steps", { count: graph.nodes?.length ?? 0 })}</p></div></Link><FlowEnabledSwitch projectId={id} flowId={f.id} enabled={f.enabled} scheduled={f.trigger === "SCHEDULE"} /><Link href={href} tabIndex={-1} aria-hidden className="text-surface-400"><ArrowRight size={16} className="rtl:-scale-x-100" /></Link></div>;
    })}</div>
  </div>;
}
