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
import { ProblemsCard } from "@/components/problems-card";
import { emailEnabled } from "@/lib/mailer";
import { getSetting } from "@/lib/settings";

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
    { done: project._count.pages > 0, title: "Build your app", detail: "Your pages, data and forms are in place.", href: editHref, icon: Paintbrush, help: designer ? "Open the AI Designer to keep building your app." : "Open the page editor to change your app's words, pictures and layout." },
    { done: Boolean(project.icon), title: "Add your app icon", detail: "It shows on phones, in browser tabs and in the Android app.", href: "#app-icon", icon: ImageIcon, help: "Jump to the app icon section below to add the small picture that stands for your app." },
    ...(appAdmins ? [{ done: appAdmins.length > 0, title: "Set your admin login", detail: "So you can sign in to your app's admin pages.", href: "#app-admin", icon: KeyRound, help: "Jump to the section below where you set the email and password you use to sign in to your app's admin pages." }] : []),
    ...(formTables > 0 ? [{ done: Boolean(testSent?.at), title: "Send a test submission", detail: "", href: "#alerts", icon: Rocket, test: true }] : []),
    { done: project.published, title: project.published ? "Published" : "Publish it", detail: project.published ? "Anyone with the link can use it." : "Get a link you can share with anyone.", href: `/projects/${id}/publish`, icon: Rocket, help: project.published ? "Go to Publish to make new changes live, share your link or go back to an earlier version." : "Go to Publish to put your app online and get a link to share." },
  ];
  const launchDone = launch.filter((s) => s.done).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-5"><div>
      <p className="studio-eyebrow mb-3 text-brand-300">YOUR APP, AT A GLANCE</p>
      <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
      <p className="text-sm text-surface-400 mt-1">
        {project.published ? (
          <>
            Live at{" "}
            <a href={publicUrl} className="text-brand-400 hover:underline" target="_blank" data-help="Your app's live web address. Opens it in a new tab, just as visitors see it.">
              {publicUrl}
            </a>
          </>
        ) : (
          "Draft — not yet published."
        )}
      </p>

      </div><Link href={editHref} className="btn-primary" data-help={designer ? "Go back to the AI Designer to keep building your app." : "Open the page editor to keep working on your app."}>{designer ? <Sparkles size={16} /> : <Paintbrush size={16} />}{designer ? "Continue in the Designer" : "Continue editing"} <ArrowRight size={16} /></Link></div>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Pages" value={project._count.pages} href={`/projects/${id}/pages`} help="How many pages your app has. Click to open them in the editor." />
        <StatCard label="Flows" value={project._count.flows} href={`/projects/${id}/flows`} help="How many things your app does by itself, like emailing you about a new message. Click to see them." />
        <StatCard label="Data" value={project._count.datasources} href={`/projects/${id}/data`} help="Where your app keeps its information, like sign-ups and orders. Click to see and edit it." />
        <StatCard label="Own domains" value={project._count.domains} href={`/projects/${id}/domains`} help="How many of your own web addresses (domains) point to this app. Click to add or manage them." />
      </div>

      {unsentEmailFlows.length > 0 && (
        <div role="status" className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-4 text-sm text-amber-100" data-testid="email-off-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
          <span>
            Your app sends emails ({unsentEmailFlows.slice(0, 3).map((n) => `“${n}”`).join(", ")}{unsentEmailFlows.length > 3 ? ` and ${unsentEmailFlows.length - 3} more` : ""}), but email isn&apos;t set up on this server, so they aren&apos;t being sent.{" "}
            {user.role === "ADMIN" ? <Link href="/admin/settings#email" className="font-medium underline">Set up email</Link> : "Ask your provider to connect email."}
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
            <p className="studio-eyebrow">GET IT IN PEOPLE&apos;S HANDS</p>
            <span className="text-xs text-surface-400">{launchDone} of {launch.length} done</span>
          </div>
          <h2 id="launch-heading" className="mt-2 text-lg font-semibold" data-help="The steps to get your app ready and in front of people. Each ticks itself off when it's done.">Launch checklist</h2>
          <ol className="mt-4 space-y-1">
            {launch.map(({ done, title, detail, href, icon: Icon, test, help }) => (
              <li key={title}>
                {test ? <TestSubmissionStep projectId={project.id} initiallyDone={done} emailOn={emailOn} /> : <Link href={href} className="studio-next-step" data-help={help}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.05] text-brand-300"}`}>{done ? <Check size={15} aria-hidden /> : <Icon size={15} aria-hidden />}</span>
                  <span className="flex-1"><strong className={`block text-sm font-medium ${done ? "text-surface-300" : ""}`}>{title}<span className="sr-only">{done ? " (done)" : " (to do)"}</span></strong><span className="mt-0.5 block text-xs text-surface-400">{detail}</span></span>
                  <ArrowRight size={14} className="text-surface-500" aria-hidden />
                </Link>}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><Smartphone size={15} className="text-brand-300" aria-hidden />Open it on your phone</p>
            {qrDataUrl ? (
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt={`QR code for ${publicUrl}`} width={112} height={112} className="rounded-lg bg-white p-1" data-help="Point your phone's camera at this square code to open your live app on your phone." />
                <p className="text-xs leading-relaxed text-surface-400">Point your phone&apos;s camera at the code. Then use &ldquo;Add to Home Screen&rdquo; and it opens like an app.</p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-surface-400">Publish first, then scan a code here to try it on your phone.</p>
            )}
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-wider text-surface-500">Optional</p>
          <div className="mt-1 space-y-1">
            <Link href={`/projects/${id}/theme`} className="studio-next-step" data-help="Go to Theme to pick the colors, fonts and corner shapes for your whole app."><Paintbrush size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">Change colours and fonts</strong><span className="mt-0.5 block text-xs text-surface-400">Match your brand in a couple of clicks.</span></span><ArrowRight size={14} className="text-surface-500" aria-hidden /></Link>
            <Link href={`/projects/${id}/domains`} className="studio-next-step" data-help="Go to Domains to put your app on a web address you own, instead of the one it gets for free."><Globe2 size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">{activeDomains ? "Your own domain is connected" : "Use your own domain"}</strong><span className="mt-0.5 block text-xs text-surface-400">{activeDomains ? "Manage your web addresses." : "Like www.yourbusiness.com."}</span></span><ArrowRight size={14} className="text-surface-500" aria-hidden /></Link>
            <Link href={`/projects/${id}/native`} className="studio-next-step" data-help="Go to Mobile app to build the Android app file, which people can install on their phones or you can put on Google Play."><Smartphone size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">Get the Android app</strong><span className="mt-0.5 block text-xs text-surface-400">Download an app file you can install or put on Google Play.</span></span><ArrowRight size={14} className="text-surface-500" aria-hidden /></Link>
            <Link href={`/projects/${id}/modules`} className="studio-next-step" data-help="Go to Features to add ready-made parts to your app, each with its own pages."><Blocks size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">Add a feature</strong><span className="mt-0.5 block text-xs text-surface-400">Bookings, a shop, a blog, sign-ups and more.</span></span><ArrowRight size={14} className="text-surface-500" aria-hidden /></Link>
            <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer" className="studio-next-step" data-help="Open your app in a new tab with your latest changes, even ones you haven't published yet."><ExternalLink size={17} className="text-brand-300" aria-hidden /><span className="flex-1"><strong className="block text-sm font-medium">Try it as a visitor</strong><span className="mt-0.5 block text-xs text-surface-400">Opens a preview in a new tab.</span></span><ArrowRight size={14} className="text-surface-500" aria-hidden /></a>
          </div>
        </section>
        <div className="card p-6">
          <h2 className="font-semibold">Settings</h2>
          <dl className="mt-3 text-sm">
            <RenameProjectField projectId={project.id} initialName={project.name} />
            <div className="flex justify-between gap-4 py-1 border-b border-surface-800">
              <dt className="text-surface-400">Web address</dt>
              <dd className="truncate text-surface-200">{project.published ? <a href={publicUrl} target="_blank" rel="noopener" className="hover:underline" data-help="Your app's live web address. Opens it in a new tab.">{publicUrl.replace(/^https?:\/\//, "")}</a> : "After you publish"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-surface-400">Created</dt>
              <dd className="text-surface-200">
                {new Date(project.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <AppAdminCard projectId={project.id} />
      <LatestSubmissionsCard projectId={project.id} />
      <AlertsCard projectId={project.id} />

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
  value: number;
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
