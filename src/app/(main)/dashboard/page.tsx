import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { limitsForUser } from "@/lib/plan-limits";
import { aiAllowance, aiQuotaProblem } from "@/lib/ai-quota";
import { aiReady } from "@/lib/ai/client";
import { billingScopeFor, getPublicPlans } from "@/lib/stripe";
import { StudioDashboard } from "@/components/studio/dashboard";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { themeToCss, type ProjectTheme } from "@/lib/theme";
import { problemCountsByProject } from "@/lib/flow-activity";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [projects, limits, ai, ready, quotaProblem, plans] = await Promise.all([
    db.project.findMany({
      where: { ownerId: user.id }, orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { pages: true, flows: true } },
        pages: { orderBy: [{ isHome: "desc" }, { createdAt: "asc" }], select: { html: true, css: true }, take: 1 },
      },
    }), limitsForUser(user), aiAllowance(user), aiReady(), aiQuotaProblem(user).catch(() => null), getPublicPlans(billingScopeFor(user)).catch(() => []),
  ]);
  // Apps whose flows failed or had a problem for visitors in the last 24 hours.
  const problems = await problemCountsByProject(projects.map((p) => p.id)).catch(() => new Map<string, number>());
  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user} />
      <StudioDashboard name={user.name?.split(" ")[0] || "there"} plan={user.plan}
        maxProjects={Number.isFinite(limits.maxProjects) ? limits.maxProjects : null}
        ai={ai}
        canDescribe={ready && !quotaProblem}
        aiPaused={ready ? quotaProblem : null}
        canUpgrade={plans.some((p) => p.key !== "FREE")}
        baseCss={(await readFile(path.join(process.cwd(), "public", "nk-public.css"), "utf8").catch(() => "")).replace(/\/\*[\s\S]*?\*\//g, "")}
        projects={projects.map((p) => ({
          id: p.id, name: p.name, slug: p.slug, kind: p.kind,
          published: p.published, updatedAt: p.updatedAt.toISOString(),
          pageCount: p._count.pages, flowCount: p._count.flows,
          html: p.pages[0]?.html ?? "", css: p.pages[0]?.css ?? "",
          themeCss: themeToCss(p.theme as ProjectTheme | null),
          problems: problems.get(p.id) ?? 0,
        }))} />
    </main>
  );
}
