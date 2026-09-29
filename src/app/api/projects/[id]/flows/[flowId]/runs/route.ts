import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { PROBLEM_RUN_SQL, toActivityRun } from "@/lib/flow-activity";
import type { FlowGraph } from "@/lib/flow/types";
import { json } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = { id: string; status: string; input: unknown; output: unknown; error: string | null; durationMs: number | null; createdAt: Date };

/**
 * The flow's last 100 runs for its Activity tab, newest first, each with a
 * plain-language line. ?failed=1 lists only runs with a problem (failed, or
 * finished with a warning such as an email that wasn't sent). Owner only.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; flowId: string }> }) {
  const { id, flowId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const flow = await db.flow.findFirst({ where: { id: flowId, projectId: id }, select: { id: true, name: true, graph: true } });
  if (!flow) return json({ error: "Not found" }, { status: 404 });

  const failedOnly = new URL(req.url).searchParams.get("failed") === "1";
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [rows, counts] = await Promise.all([
    failedOnly
      ? db.$queryRaw<Row[]>`
          SELECT r."id", r."status", r."input", r."output", r."error", r."durationMs", r."createdAt"
            FROM "FlowRun" r
           WHERE r."flowId" = ${flow.id} AND ${PROBLEM_RUN_SQL}
           ORDER BY r."createdAt" DESC
           LIMIT 100`
      : db.flowRun.findMany({
          where: { flowId: flow.id },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, status: true, input: true, output: true, error: true, durationMs: true, createdAt: true },
        }),
    db.$queryRaw<Array<{ total: number; problems: number }>>`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE ${PROBLEM_RUN_SQL})::int AS problems
        FROM "FlowRun" r
       WHERE r."flowId" = ${flow.id} AND r."createdAt" >= ${since}`,
  ]);
  const graph = flow.graph as unknown as FlowGraph;
  return json({
    flow: { id: flow.id, name: flow.name },
    runs: (rows as Row[]).map((row) => toActivityRun(graph, { ...row, createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt) })),
    last24h: { total: Number(counts[0]?.total ?? 0), problems: Number(counts[0]?.problems ?? 0) },
  });
}

