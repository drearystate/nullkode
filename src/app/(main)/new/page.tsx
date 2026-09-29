import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkProjectLimit } from "@/lib/guard";
import { billingScopeFor, getPublicPlans } from "@/lib/stripe";
import { aiReady } from "@/lib/ai/client";
import { aiQuotaProblem } from "@/lib/ai-quota";
import { TopBar } from "@/components/top-bar";
import { NewProjectWizard } from "@/components/new-project-wizard";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ runId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { runId } = await searchParams;
  const [ready, problem, limit] = await Promise.all([aiReady(), aiQuotaProblem(user), checkProjectLimit(user)]);
  // A build that's already running (or just finished) is shown even at the limit.
  const limitMessage = limit && !runId ? ((await limit.json().catch(() => ({}))) as { error?: string }).error || "You've reached your app limit." : null;

  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user} />
      {limitMessage ? (
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;ve reached your app limit</h1>
          <p className="mt-3 text-sm text-surface-400">{limitMessage}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {(await getPublicPlans(billingScopeFor(user)).catch(() => [])).some((p) => p.key !== "FREE") && <Link href="/billing" className="btn-primary">See plans</Link>}
            <Link href="/dashboard" className="btn-ghost">Back to your apps</Link>
          </div>
        </div>
      ) : (
        <NewProjectWizard aiReady={ready} aiProblem={problem} isAdmin={user.role === "ADMIN"} />
      )}
    </main>
  );
}
