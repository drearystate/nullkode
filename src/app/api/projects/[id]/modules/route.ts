import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { MODULE_REGISTRY, getModule, listModuleSummaries } from "@/lib/modules/registry";
import { computeProvidedCapabilities, installModule, UnmetRequirementsError } from "@/lib/modules/install";
import { installedModules } from "@/lib/modules/installed";
import { emailEnabled } from "@/lib/mailer";
import { friendlyName } from "@/components/modules/friendly";
import type { ModuleCapability, ModuleDefinition } from "@/lib/modules/types";

const InstallBody = z.object({
  moduleId: z.string().min(1),
  config: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  skipPages: z.boolean().optional(),
  /** Starting rows per feature table (a premade block's sample items). */
  seed: z.record(z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))).max(50)).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json({ modules: listModuleSummaries(), installed: await installedModules(id) });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;

  const parsed = InstallBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  const module = getModule(parsed.data.moduleId);
  if (!module) return json({ error: "Module not found" }, { status: 404 });

  const blocked = await missingRequirements(id, module);
  if (blocked) return json(blocked, { status: 409 });

  try {
    const result = await installModule({
      projectId: id,
      module,
      config: parsed.data.config,
      skipPages: parsed.data.skipPages,
      seed: seedFor(module, parsed.data.seed),
      // Checked above, in plain words, counting the server's email settings
      // and the capabilities a feature brings itself.
      allowUnmetRequirements: true,
    });
    // The page list after the install, in the editor's order, so the editor
    // can show the new pages without a reload.
    const pages = await db.page.findMany({
      where: { projectId: id },
      orderBy: [{ isHome: "desc" }, { createdAt: "asc" }],
      select: { id: true, title: true, slug: true, isHome: true },
    });
    return json({
      ok: true,
      moduleId: module.id,
      name: friendlyName(module),
      firstPageId: result.firstPageId,
      flowIds: Object.fromEntries(result.flowIds),
      pageIds: Object.fromEntries(result.pageIds),
      pages,
      installed: await installedModules(id),
    });
  } catch (err) {
    if (err instanceof UnmetRequirementsError) {
      return json({ ...needsFeatures(err.unmet), unmet: err.unmet }, { status: 409 });
    }
    return json(
      { error: err instanceof Error ? err.message : "Install failed" },
      { status: 500 }
    );
  }
}

/**
 * Starting rows limited to the feature's own tables and columns: column
 * names become SQL identifiers when the rows are added.
 */
function seedFor(
  module: ModuleDefinition,
  seed: Record<string, Array<Record<string, string | number | boolean | null>>> | undefined
): Record<string, Array<Record<string, unknown>>> | undefined {
  if (!seed) return undefined;
  const out: Record<string, Array<Record<string, unknown>>> = {};
  for (const t of module.tables) {
    const rows = seed[t.name];
    if (!rows) continue;
    const columns = new Set(t.fields.map((f) => f.name));
    out[t.name] = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => columns.has(k))));
  }
  return out;
}

/** Capabilities that come from the server's settings, not from another feature. */
const SERVER_CAPABILITIES = new Set<ModuleCapability>(["email"]);

/**
 * What stops this feature being added, in plain words, or null. A feature's
 * own capabilities count (the chat helper brings the AI it needs), and email
 * comes from the server's settings rather than another feature.
 */
async function missingRequirements(projectId: string, module: ModuleDefinition) {
  const requires = module.requires ?? [];
  if (requires.length === 0) return null;
  const provided = await computeProvidedCapabilities(projectId);
  const own = new Set(module.provides ?? []);
  const missing = requires.filter((c) => !provided.has(c) && !own.has(c));
  if (missing.some((c) => !SERVER_CAPABILITIES.has(c))) return { ...needsFeatures(missing), unmet: missing };
  if (missing.includes("email") && !emailEnabled()) {
    return {
      error: "This needs email to be set up on the server first. Ask your provider to connect email.",
      needs: [],
      unmet: missing,
    };
  }
  return null;
}

/** "This needs Sign-in and accounts first.", naming the features to add. */
function needsFeatures(caps: ModuleCapability[]) {
  const needs: Array<{ id: string; name: string }> = [];
  for (const cap of caps) {
    if (SERVER_CAPABILITIES.has(cap)) continue;
    // The plain sign-in feature for sign-in; otherwise the first feature
    // that brings the capability.
    const provider =
      (cap === "auth-session" || cap === "auth-users" ? getModule("auth") : undefined) ??
      MODULE_REGISTRY.find((m) => m.provides?.includes(cap));
    if (provider && !needs.some((n) => n.id === provider.id)) needs.push({ id: provider.id, name: friendlyName(provider) });
  }
  const names = needs.map((n) => n.name);
  const list = names.length === 0 ? "another feature" : names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const email = caps.includes("email") && !emailEnabled() ? " It also needs email to be set up on the server." : "";
  return { error: `This needs ${list} first.${email}`, needs };
}
