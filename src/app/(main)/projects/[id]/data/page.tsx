import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DataPanel } from "@/components/data/data-panel";
import type { TableSummary } from "@/components/data/format";
import { listTables } from "@/app/api/projects/[id]/data/_lib/tables";

export default async function DataPage({
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
      datasources: { include: { tables: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!project || project.ownerId !== user.id) notFound();

  let tables: TableSummary[] = [];
  try {
    tables = await listTables(id);
  } catch (err) {
    console.error("[data] listing tables failed", err);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">WHAT PEOPLE SENT YOU</p>
      <h1 className="text-3xl font-semibold tracking-tight">Your app&apos;s data.</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-400">
        Everything your app saves, like messages, bookings and sign-ups. Open a table to see it, change it or download it.
      </p>
      <DataPanel
        projectId={id}
        tables={tables}
        datasources={project.datasources.map((d) => ({
          id: d.id,
          name: d.name,
          kind: d.kind,
          tables: d.tables.map((t) => ({
            id: t.id,
            name: t.name,
            fields: (t.schema as unknown as { fields: { name: string; type: string }[] })?.fields ?? [],
          })),
        }))}
      />
    </div>
  );
}
