import { z } from "zod";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { getSeoSettings, parseSearchConsoleToken, primaryUrl, saveSeoSettings, sitemapUrl } from "@/lib/seo";

/**
 * An app's search settings: "Hide from search engines" and the Google Search
 * Console verification code. Stored in Setting `seo:<projectId>`; changes
 * apply to the live app straight away (they aren't part of a published
 * version).
 */

const Body = z.object({
  noindex: z.boolean().optional(),
  searchConsoleToken: z.string().max(600).nullable().optional(),
});

async function view(project: { id: string; slug: string; ownerId: string; hostLabel: string | null }) {
  const [settings, primary] = await Promise.all([getSeoSettings(project.id), primaryUrl(project)]);
  return { ...settings, address: primary.kind === "path" ? primary.base : `${primary.base}/`, sitemapUrl: sitemapUrl(primary) };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json(await view(r.project));
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
  const patch: { noindex?: boolean; searchConsoleToken?: string | null } = {};
  if (parsed.data.noindex !== undefined) patch.noindex = parsed.data.noindex;
  if (parsed.data.searchConsoleToken !== undefined) {
    const token = parseSearchConsoleToken(parsed.data.searchConsoleToken);
    if (token === "invalid") {
      return json({ error: "That doesn't look like a Google verification code. Paste the code from the HTML tag option, or the whole tag." }, { status: 400 });
    }
    patch.searchConsoleToken = token;
  }
  await saveSeoSettings(id, patch);
  return json(await view(r.project));
}

export const PUT = PATCH;
