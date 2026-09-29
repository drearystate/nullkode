import Link from "next/link";
import { notFound } from "next/navigation";
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
  return <div className="mx-auto max-w-6xl px-6 py-10">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="studio-eyebrow mb-3 text-brand-300">MAKE THINGS HAPPEN</p><h1 className="text-3xl font-semibold tracking-tight">Your app’s flows.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-400">Turn a click into an action. Save a booking, send an email, or bring your data to life.</p></div><NewFlowButton projectId={id} /></div>
    <div className="studio-flow-explainer" data-help="How automations work: something happens in your app, like a form being sent; your steps run in order; then the person gets a result, like a thank-you message."><span><span className="studio-method-icon"><Workflow size={19} /></span>Something happens</span><ArrowRight size={16} /><span><span className="studio-method-icon"><GitBranch size={19} /></span>Your steps run</span><ArrowRight size={16} /><span>A result for your user</span></div>
    <div className="mt-7 grid grid-cols-1 gap-3">{project.flows.length === 0 ? <div className="studio-empty"><GitBranch size={30} className="text-brand-300" /><h2 className="mt-4 font-semibold">A little automation goes a long way.</h2><p className="mt-2 max-w-md text-sm text-surface-400">Create your first flow, or add a ready-made feature with its flows already connected.</p><Link href={`/projects/${id}/modules`} className="btn-ghost mt-5" data-help="Browse ready-made features, like bookings or a contact form. They come with their automations already set up.">Explore features <ArrowRight size={14} /></Link></div> : project.flows.map((f) => {
      const graph = f.graph as { nodes?: unknown[]; edges?: unknown[] };
      const href = `/projects/${id}/flows/${f.id}`;
      return <div key={f.id} className="studio-flow-card"><Link href={href} className="flex min-w-0 flex-1 items-center gap-[18px]" data-help="Open this automation to see and change its steps, check what happened each time it ran, or set when it runs."><span className="studio-method-icon"><GitBranch size={19} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-medium">{f.name}</h2><p className="mt-1 text-xs text-surface-400">{f.trigger === "SCHEDULE" ? "Runs on a schedule" : f.trigger === "FORM_SUBMIT" ? "Starts with a form" : f.trigger === "EVENT" ? "Starts with an event" : "Starts with a request"}<span className="mx-2 text-surface-600">·</span>{graph.nodes?.length ?? 0} steps</p></div></Link><FlowEnabledSwitch projectId={id} flowId={f.id} enabled={f.enabled} scheduled={f.trigger === "SCHEDULE"} /><Link href={href} tabIndex={-1} aria-hidden className="text-surface-400"><ArrowRight size={16} /></Link></div>;
    })}</div>
  </div>;
}
