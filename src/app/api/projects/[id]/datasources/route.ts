import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { ensureInternalTable } from "@/lib/datasources/postgres";

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(["POSTGRES_INTERNAL", "POSTGRES_EXTERNAL", "GOOGLE_SHEETS"]),
  config: z.record(z.any()).optional(),
});

const TableBody = z.object({
  datasourceId: z.string().min(1),
  name: z.string().min(1).max(60),
  fields: z.array(
    z.object({
      name: z.string().min(1).max(60),
      type: z.enum(["text", "int", "float", "bool", "timestamp", "json"]),
    })
  ),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const sources = await db.dataSource.findMany({
    where: { projectId: id },
    include: { tables: true },
    orderBy: { createdAt: "desc" },
  });
  return json({ datasources: sources });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const body = await req.json().catch(() => null);

  if (body?._action === "create_table") {
    const parsed = TableBody.safeParse(body);
    if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
    const source = await db.dataSource.findFirst({
      where: { id: parsed.data.datasourceId, projectId: id },
    });
    if (!source) return json({ error: "Data source not found" }, { status: 404 });
    if (source.kind === "POSTGRES_INTERNAL") {
      await ensureInternalTable(id, parsed.data.name, parsed.data.fields);
    }
    const table = await db.dataTable.create({
      data: {
        datasourceId: source.id,
        name: parsed.data.name,
        schema: { fields: parsed.data.fields },
      },
    });
    return json({ table });
  }

  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
  const source = await db.dataSource.create({
    data: {
      projectId: id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      config: parsed.data.config ?? {},
    },
  });
  return json({ datasource: source });
}
