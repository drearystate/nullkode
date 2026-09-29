import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { problemsByFlow, type FlowProblem } from "@/lib/flow-activity";

function times(n: number) {
  return n === 1 ? "once" : n === 2 ? "twice" : `${n} times`;
}

function people(n: number) {
  return n === 1 ? "1 person" : `${n} people`;
}

/**
 * Plain sentences per flow, e.g. "“Book a table” went through once, but the
 * email wasn't sent because email isn't set up. It also had a problem once:
 * The email server rejected the username or password."
 */
function line(p: FlowProblem): string {
  const clauses: string[] = [];
  if (p.failed) clauses.push(`didn't go through for ${people(p.failed)}`);
  if (p.emailOff) clauses.push(`went through ${times(p.emailOff)}, but the email wasn't sent because email isn't set up`);
  const other = p.warned - p.emailOff;
  if (other > 0) {
    const what = p.lastWarning && !/email isn't set up/i.test(p.lastWarning) ? `: ${p.lastWarning.replace(/[.\s]+$/, "")}` : "";
    clauses.push(`had a problem ${times(other)}${what}`);
  }
  return clauses.map((c, i) => (i === 0 ? `“${p.flowName}” ${c}.` : `It also ${c}.`)).join(" ");
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
  const total = problems.reduce((n, p) => n + p.failed + p.warned, 0);
  const emailIssue = !emailOn && problems.some((p) => p.emailOff > 0);
  return (
    <section id="problems" className="card mt-6 scroll-mt-24 border-amber-400/25 p-6" aria-labelledby="problems-heading" data-testid="problems-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="problems-heading" className="flex items-center gap-2 font-semibold" data-help="Times in the last day when one of your automations failed or couldn’t finish something, like an email that wasn’t sent.">
          <AlertTriangle size={17} className="text-amber-300" aria-hidden />
          Problems in the last 24 hours
        </h2>
        <span className="text-xs text-surface-400" data-testid="problems-total">{total} {total === 1 ? "problem" : "problems"}</span>
      </div>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {problems.map((p) => (
          <li key={p.flowId} className="py-3" data-testid="problem-line">
            <p className="text-sm text-surface-100">{line(p)}</p>
            {p.failed > 0 && p.lastError && <p className="mt-1 text-xs text-surface-400">Last error: {p.lastError.slice(0, 200)}</p>}
            <Link href={`/projects/${projectId}/flows/${p.flowId}?tab=activity`} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:underline" data-help="Open this automation’s Activity to see each run, including what people sent, so you can get back to them.">
              {p.failed ? "See who it was and what they sent" : "See what happened"}
              <ArrowRight size={12} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {emailIssue && (
        <p className="mt-2 text-xs text-surface-400">
          Email isn&apos;t set up on this server.{" "}
          {canSetUpEmail ? <Link href="/admin/settings#email" className="text-brand-300 hover:underline" data-help="Open the server settings to connect an email service, so apps can send emails.">Set up email</Link> : "Ask your provider to connect email."}
        </p>
      )}
    </section>
  );
}
