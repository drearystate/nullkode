import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { requireReseller } from "@/lib/reseller-admin";
import { forgetResellerHosts } from "@/lib/reseller";

const hex = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Use a colour like #2563eb.");
const image = z.string().max(200_000, "Images must be under 150 KB.").regex(/^data:image\/(png|jpeg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,/, "Upload a PNG, JPG, WebP, SVG or ICO image.");
const Body = z.object({
  name: z.string().trim().min(2, "Enter your brand name.").max(60).optional(),
  tagline: z.string().trim().max(160).nullable().optional(),
  logoDataUrl: image.nullable().optional(),
  faviconDataUrl: image.nullable().optional(),
  colorPrimary: hex.optional(),
  colorAccent: hex.optional(),
  supportEmail: z.string().trim().email("Enter a valid support email.").nullable().optional().or(z.literal("")),
  homepageUrl: z.string().trim().url("Enter a full URL, starting with https://").nullable().optional().or(z.literal("")),
});

/** The name, logo, colours and support contact the reseller's clients see. */
export async function PATCH(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { name, ...rest } = parsed.data;
  const brand = { ...((r.reseller.brand ?? {}) as Record<string, unknown>) };
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    if (v === null || v === "") delete brand[k];
    else brand[k] = v;
  }
  if (brand.colorPrimary) brand.colorPrimaryHover = brand.colorPrimary;
  const updated = await db.reseller.update({ where: { id: r.reseller.id }, data: { ...(name ? { name } : {}), brand: brand as Prisma.InputJsonObject } });
  forgetResellerHosts();
  return json({ ok: true, name: updated.name, brand: updated.brand });
}
