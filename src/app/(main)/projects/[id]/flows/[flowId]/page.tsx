import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FlowEditor } from "@/components/flow/flow-editor";
import { SchedulePicker } from "@/components/flow/schedule-picker";
import { flowProblemCount } from "@/lib/flow-activity";
import type { FlowGraph } from "@/lib/flow/types";

export const dynamic = "force-dynamic";

export default async function FlowEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; flowId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id, flowId } = await params;
  const { tab } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const flow = await db.flow.findFirst({
    where: { id: flowId, projectId: id, project: { ownerId: user.id } },
    select: { id: true, name: true, httpPath: true, graph: true },
  });
  if (!flow) notFound();

  const [datasources, problemCount] = await Promise.all([
    db.dataSource.findMany({
      where: { projectId: id },
      include: { tables: true },
    }),
    flowProblemCount(flow.id).catch(() => 0),
  ]);

  return (
    <FlowEditor
      projectId={id}
      flowId={flow.id}
      flowName={flow.name}
      httpPath={flow.httpPath ?? ""}
      initialGraph={flow.graph as unknown as FlowGraph}
      initialTab={tab === "activity" || tab === "schedule" ? tab : "design"}
      problemCount={problemCount}
      schedulePanel={<SchedulePicker projectId={id} flowId={flow.id} />}
      datasources={datasources.map((d) => ({
        id: d.id,
        name: d.name,
        kind: d.kind,
        tables: d.tables.map((t) => {
          const schema = (t.schema ?? {}) as { fields?: Array<{ name: string; type: string }> };
          return {
            name: t.name,
            columns: (schema.fields ?? []).map((f) => ({ name: f.name, type: f.type })),
          };
        }),
      }))}
    />
  );
}
