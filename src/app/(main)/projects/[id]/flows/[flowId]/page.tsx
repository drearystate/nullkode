import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FlowEditor } from "@/components/flow/flow-editor";
import type { FlowGraph } from "@/lib/flow/types";

export const dynamic = "force-dynamic";

export default async function FlowEditorPage({
  params,
}: {
  params: Promise<{ id: string; flowId: string }>;
}) {
  const { id, flowId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const flow = await db.flow.findFirst({
    where: { id: flowId, projectId: id, project: { ownerId: user.id } },
  });
  if (!flow) notFound();

  const datasources = await db.dataSource.findMany({
    where: { projectId: id },
    include: { tables: true },
  });

  return (
    <FlowEditor
      projectId={id}
      flowId={flowId}
      flowName={flow.name}
      httpPath={flow.httpPath ?? ""}
      initialGraph={flow.graph as unknown as FlowGraph}
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
