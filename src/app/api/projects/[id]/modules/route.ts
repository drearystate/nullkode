import { z } from "zod";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { getModule, listModuleSummaries } from "@/lib/modules/registry";
import { installModule, UnmetRequirementsError } from "@/lib/modules/install";

const InstallBody = z.object({
  moduleId: z.string().min(1),
  config: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  skipPages: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json({ modules: listModuleSummaries() });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;

  const parsed = InstallBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  const module = getModule(parsed.data.moduleId);
  if (!module) return json({ error: "Module not found" }, { status: 404 });

  try {
    const result = await installModule({
      projectId: id,
      module,
      config: parsed.data.config,
      skipPages: parsed.data.skipPages,
    });
    return json({
      ok: true,
      moduleId: module.id,
      firstPageId: result.firstPageId,
      flowIds: Object.fromEntries(result.flowIds),
      pageIds: Object.fromEntries(result.pageIds),
    });
  } catch (err) {
    if (err instanceof UnmetRequirementsError) {
      return json(
        { error: err.message, unmet: err.unmet },
        { status: 409 }
      );
    }
    return json(
      { error: err instanceof Error ? err.message : "Install failed" },
      { status: 500 }
    );
  }
}
