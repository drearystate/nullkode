import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { requireReseller } from "@/lib/reseller-admin";
import { forgetResellerHosts } from "@/lib/reseller";
import { isLocale } from "@/i18n/locales";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

// Error messages are keys in reseller.api.brand (translated when answering).
const hex = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "colour");
const image = z.string().max(200_000, "imageSize").regex(/^data:image\/(png|jpeg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,/, "imageType");
const Body = z.object({
  name: z.string().trim().min(2, "name").max(60).optional(),
  tagline: z.string().trim().max(160).nullable().optional(),
  logoDataUrl: image.nullable().optional(),
  faviconDataUrl: image.nullable().optional(),
  colorPrimary: hex.optional(),
  colorAccent: hex.optional(),
  supportEmail: z.string().trim().email("supportEmail").nullable().optional().or(z.literal("")),
  homepageUrl: z.string().trim().url("homepage").nullable().optional().or(z.literal("")),
  /** Default language for this reseller's clients and its domain's visitors (null = the platform's). */
  defaultLocale: z.string().refine(isLocale, "locale").nullable().optional().or(z.literal("")),
});

const BRAND_ERRORS = new Set(["colour", "imageSize", "imageType", "name", "supportEmail", "homepage", "locale"]);

/** The name, logo, colours, support contact and default language the reseller's clients see. */
export async function PATCH(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const t = await getTranslations({ locale: await requestLocale(), namespace: "reseller.api" });
    const code = parsed.error.issues[0]?.message ?? "";
    return json({ error: BRAND_ERRORS.has(code) ? t(`brand.${code}`) : t("checkForm") }, { status: 400 });
  }
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
