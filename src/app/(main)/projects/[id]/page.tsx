import Link from "next/link";
import QRCode from "qrcode";
import { appPublicUrl } from "@/lib/reseller";
import { AlertTriangle, ArrowRight, Blocks, Check, ExternalLink, Globe2, ImageIcon, KeyRound, Paintbrush, Rocket, Smartphone, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProjectIconPanel } from "@/components/project-icon-panel";
import { RenameProjectField } from "@/components/rename-project-field";
import { TransferProjectCard } from "@/components/transfer-project-card";
import { AppAdminCard } from "@/components/app-admin-card";
import { LatestSubmissionsCard } from "@/components/latest-submissions-card";
import { listAppAdmins } from "@/lib/app-admin";
import { AlertsCard, TestSubmissionStep } from "@/components/alerts-card";
import { AppLanguageCard } from "@/components/app-language-card";
import { ProblemsCard } from "@/components/problems-card";
import { emailEnabled } from "@/lib/mailer";
import { getSetting } from "@/lib/settings";
import { getFormatter, getTranslations } from "next-intl/server";

export default async function ProjectOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      _count: { select: { pages: true, flows: true, datasources: true, domains: true } },
    },
  });
  if (!project || project.ownerId !== user.id) notFound();

  // Designer apps are built in the Designer; this page still gives them their
  // alerts, problems, submissions and launch steps. "Continue" opens the Designer.
  const t = await getTranslations("project.overview");
  const format = await getFormatter();
  const designer = project.kind === "DESIGNER";
  const editHref = designer ? `/projects/${id}/designer` : `/projects/${id}/pages`;

  const publicUrl = await appPublicUrl(project);
  const emailOn = emailEnabled();
  const [activeDomains, qrDataUrl, appAdmins, formTables, testSent, flows] = await Promise.all([
    db.domain.count({ where: { projectId: project.id, status: "ACTIVE" } }),
    project.published ? QRCode.toDataURL(publicUrl, { margin: 1, width: 132 }).catch(() => null) : Promise.resolve(null),
    listAppAdmins(project.id).catch(() => null),
    db.dataTable.count({ where: { datasource: { projectId: project.id, kind: "POSTGRES_INTERNAL" } } }),
    getSetting<{ at?: string }>(`alerts-test:${project.id}`).catch(() => undefined),
    emailOn ? Promise.resolve([]) : db.flow.findMany({ where: { projectId: project.id }, select: { name: true, graph: true } }),
  ]);
  // Flows with a "Send email" step, when email isn't set up on this server.
  const unsentEmailFlows = flows
    .filter((f) => ((f.graph as { nodes?: Array<{ type?: string }> } | null)?.nodes ?? []).some((n) => n?.type === "email"))
    .map((f) => f.name);
  type LaunchStep = { done: boolean; title: string; detail: string; href: string; icon: typeof Paintbrush; test?: boolean; help?: string };
  const launch: LaunchStep[] = [
    { done: project._count.pages > 0, title: t("launch.build.title"), detail: t("launch.build.detail"), href: editHref, icon: Paintbrush, help: designer ? t("launch.build.helpDesigner") : t("launch.build.help") },
    { done: Boolean(project.icon), title: t("launch.icon.title"), detail: t("launch.icon.detail"), href: "#app-icon", icon: ImageIcon, help: t("launch.icon.help") },
    ...(appAdmins ? [{ done: appAdmins.length > 0, title: t("launch.admin.title"), detail: t("launch.admin.detail"), href: "#app-admin", icon: KeyRound, help: t("launch.admin.help") }] : []),
    ...(formTables > 0 ? [{ done: Boolean(testSent?.at), title: t("launch.test.title"), detail: "", href: "#alerts", icon: Rocket, test: true }] : []),
    { done: project.published, title: project.published ? t("launch.publish.titleDone") : t("launch.publish.title"), detail: project.published ? t("launch.publish.detailDone") : t("launch.publish.detail"), href: `/projects/${id}/publish`, icon: Rocket, help: project.published ? t("launch.publish.helpDone") : t("launch.publish.help") },
  ];
  const launchDone = launch.filter((s) => s.done).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-5"><div>
      <p className="studio-eyebrow mb-3 text-brand-300">{t("eyebrow")}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
      <p className="text-sm text-surface-400 mt-1">
        {project.published ? (
          t.rich("liveAt", {
            url: publicUrl,
            link: (c) => (
              <a href={publicUrl} dir="ltr" className="text-brand-400 hover:underline" target="_blank" data-help={t("liveAtHelp")}>
                {c}
              </a>
            ),
          })
        ) : (
          t("draft")
        )}
      </p>

      </div><Link href={editHref} className="btn-primary" data-help={designer ? t("continueDesignerHelp") : t("continueEditingHelp")}>{designer ? <Sparkles size={16} /> : <Paintbrush size={16} />}{designer ? t("continueDesigner") : t("continueEditing")} <ArrowRight size={16} className="rtl:-scale-x-100" /></Link></div>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label={t("stats.pages")} value={format.number(project._count.pages)} href={`/projects/${id}/pages`} help={t("stats.pagesHelp")} />
        <StatCard label={t("stats.flows")} value={format.number(project._count.flows)} href={`/projects/${id}/flows`} help={t("stats.flowsHelp")} />
        <StatCard label={t("stats.data")} value={format.number(project._count.datasources)} href={`/projects/${id}/data`} help={t("stats.dataHelp")} />
        <StatCard label={t("stats.domains")} value={format.number(project._count.domains)} href={`/projects/${id}/domains`} help={t("stats.domainsHelp")} />
      </div>

      {unsentEmailFlows.length > 0 && (
        <div role="status" className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-4 text-sm text-amber-100" data-testid="email-off-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
          <span>
            {t(unsentEmailFlows.length > 3 ? "emailOffMore" : "emailOff", {
              flows: format.list(unsentEmailFlows.slice(0, 3).map((n) => t("quoted", { name: n })), { type: "unit" }),
              more: unsentEmailFlows.length - 3,
            })}{" "}
            {user.role === "ADMIN" ? <Link href="/admin/settings#email" className="font-medium underline">{t("setUpEmail")}</Link> : t("askProvider")}
          </span>
        </div>
      )}

      <ProblemsCard projectId={project.id} emailOn={emailOn} canSetUpEmail={user.role === "ADMIN"} />

      <div id="app-icon" className="mt-10 scroll-mt-24">
        <ProjectIconPanel
          projectId={project.id}
          initialIcon={project.icon}
          projectName={project.name}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="launch-heading">
          <div className="flex items-baseline justify-between gap-3">
            <p className="studio-eyebrow">{t("launchEyebrow")}</p>
            <span className="text-xs text-surface-400">{t("launchProgress", { done: launchDone, total: launch.length })}</span>
          </div>
          <h2 id="launch-heading" className="mt-2 text-lg font-semibold" data-help={t("launchHelp")}>{t("launchTitle")}</h2>
          <ol className="mt-4 space-y-1">
            {launch.map(({ done, title, detail, href, icon: Icon, test, help }) => (
              <li key={title}>
                {test ? <TestSubmissionStep projectId={project.id} initiallyDone={done} emailOn={emailOn} /> : <Link href={href} className="studio-next-step" data-help={help}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.05] text-brand-300"}`}>{done ? <Check size={15} aria-hidden /> : <Icon size={15} aria-hidden />}</span>
                  <span className="flex-1"><strong className={`block text-sm font-medium ${done ? "text-surface-300" : ""}`}>{title}<span className="sr-only">{done ? t("stepDone") : t("stepToDo")}</span></strong><span className="mt-0.5 block text-xs text-surface-400">{detail}</span></span>
                  <ArrowRight size={14} className="text-surface-500 rtl:-scale-x-100" aria-hidden />
                </Link>}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><Smartphone size={15} className="text-brand-300" aria-hidden />{t("phoneTitle")}</p>
            {qrDataUrl ? (
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt={t("qrAlt", { url: publicUrl })} width={112} height={112} className="rounded-lg bg-fixed-white p-1" data-help={t("qrHelp")} />
                <p className="text-xs leading-relaxed text-surface-400">{t("qrHint")}</p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-surface-400">{t("qrPublishFirst")}</p>
            )}
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-wider text-surface-500">{t("optional")}</p>
          <div className="mt-1 space-y-1">
            <Link href={`/projects/${id}/theme`} className="studio-next-step" data-help={t("next.theme.help")}><Paintbrush size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">{t("next.theme.title")}</strong><span className="mt-0.5 block text-xs text-surface-400">{t("next.theme.detail")}</span></span><ArrowRight size={14} className="text-surface-500 rtl:-scale-x-100" aria-hidden /></Link>
            <Link href={`/projects/${id}/domains`} className="studio-next-step" data-help={t("next.domains.help")}><Globe2 size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">{activeDomains ? t("next.domains.titleDone") : t("next.domains.title")}</strong><span className="mt-0.5 block text-xs text-surface-400">{activeDomains ? t("next.domains.detailDone") : t("next.domains.detail")}</span></span><ArrowRight size={14} className="text-surface-500 rtl:-scale-x-100" aria-hidden /></Link>
            <Link href={`/projects/${id}/native`} className="studio-next-step" data-help={t("next.native.help")}><Smartphone size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">{t("next.native.title")}</strong><span className="mt-0.5 block text-xs text-surface-400">{t("next.native.detail")}</span></span><ArrowRight size={14} className="text-surface-500 rtl:-scale-x-100" aria-hidden /></Link>
            <Link href={`/projects/${id}/modules`} className="studio-next-step" data-help={t("next.feature.help")}><Blocks size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">{t("next.feature.title")}</strong><span className="mt-0.5 block text-xs text-surface-400">{t("next.feature.detail")}</span></span><ArrowRight size={14} className="text-surface-500 rtl:-scale-x-100" aria-hidden /></Link>
            <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer" className="studio-next-step" data-help={t("next.preview.help")}><ExternalLink size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">{t("next.preview.title")}</strong><span className="mt-0.5 block text-xs text-surface-400">{t("next.preview.detail")}</span></span><ArrowRight size={14} className="text-surface-500 rtl:-scale-x-100" aria-hidden /></a>
          </div>
        </section>
        <div className="card p-6">
          <h2 className="font-semibold">{t("settings")}</h2>
          <dl className="mt-3 text-sm">
            <RenameProjectField projectId={project.id} initialName={project.name} />
            <div className="flex justify-between gap-4 py-1 border-b border-surface-800">
              <dt className="text-surface-400">{t("webAddress")}</dt>
              <dd className="truncate text-surface-200">{project.published ? <a href={publicUrl} dir="ltr" target="_blank" rel="noopener" className="hover:underline" data-help={t("webAddressHelp")}>{publicUrl.replace(/^https?:\/\//, "")}</a> : t("afterPublish")}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-surface-400">{t("created")}</dt>
              <dd className="text-surface-200">
                {format.dateTime(new Date(project.createdAt), { dateStyle: "medium" })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <AppAdminCard projectId={project.id} />
      <LatestSubmissionsCard projectId={project.id} />
      <AlertsCard projectId={project.id} />
      <AppLanguageCard projectId={project.id} />

      <div className="mt-6">
        <TransferProjectCard projectId={project.id} projectName={project.name} />
      </div>

    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  help,
}: {
  label: string;
  value: string;
  href: string;
  help?: string;
}) {
  return (
    <Link href={href} data-help={help} className="card p-5 hover:border-brand-500 transition block">
      <div className="text-xs uppercase tracking-wider text-surface-400">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </Link>
  );
}
