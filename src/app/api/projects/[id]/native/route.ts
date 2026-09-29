import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { z } from "zod";
import {
  nativeConfigFor,
  publishedAppUrl,
  isValidBundleId,
  sanitizeBundleSegment,
} from "@/lib/native";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  appId: z.string().min(3).max(120).optional(),
  appName: z.string().min(1).max(30).optional(),
  version: z
    .string()
    .regex(/^\d+(\.\d+){0,2}$/, "Use a version like 1.0.0")
    .optional(),
  build: z.number().int().min(1).max(2_000_000).optional(),
  orientation: z.enum(["default", "portrait", "landscape"]).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  androidEnabled: z.boolean().optional(),
  iosEnabled: z.boolean().optional(),
});

async function load(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id)
    return { error: "Not found" as const, status: 404 };
  return { project };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await load(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const { project } = res;
  return json({
    config: await nativeConfigFor(project),
    published: project.published,
    liveUrl: (await publishedAppUrl(project)),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await load(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const { project } = res;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Normalize a user-supplied bundle id; reject if it can't be made valid.
  let appId = parsed.data.appId;
  if (appId !== undefined) {
    appId = appId.trim().toLowerCase();
    if (!isValidBundleId(appId)) {
      // Try to coerce dotted segments into validity before giving up.
      appId = appId
        .split(".")
        .map((s) => sanitizeBundleSegment(s))
        .join(".");
      if (!isValidBundleId(appId)) {
        return json(
          { error: "Bundle ID must be reverse-DNS, e.g. com.company.app" },
          { status: 400 },
        );
      }
    }
  }

  const current = await nativeConfigFor(project);
  const next = {
    ...current,
    ...parsed.data,
    ...(appId !== undefined ? { appId } : {}),
  };

  await db.project.update({ where: { id }, data: { native: next } });
  return json({ config: next });
}
