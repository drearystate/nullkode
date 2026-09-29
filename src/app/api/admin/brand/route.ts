import { z } from "zod";
import { getRealUser } from "@/lib/auth";
import { getBrand, safeDataUrl, updateBrand } from "@/lib/brand";

// Same shape as the reseller brand form (lib components/reseller/brand-form).
const Body = z.object({
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(300).nullable().optional(),
  logoDataUrl: z.string().max(300_000).nullable().optional(),
  faviconDataUrl: z.string().max(300_000).nullable().optional(),
  colorPrimary: z.string().regex(/^#[0-9a-f]{6}$/i),
  colorAccent: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  supportEmail: z.string().email().nullable().optional().or(z.literal("")),
  homepageUrl: z.string().url().nullable().optional().or(z.literal("")),
});

export async function GET() {
  if ((await getRealUser())?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  return Response.json(await getBrand());
}

export async function PATCH(req: Request) {
  if ((await getRealUser())?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Check the name, colours, email and website address." }, { status: 400 });
  const b = p.data;
  const image = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : safeDataUrl(v));
  return Response.json(
    await updateBrand({
      appName: b.name,
      tagline: b.tagline ?? "",
      logoDataUrl: image(b.logoDataUrl),
      faviconDataUrl: image(b.faviconDataUrl),
      colorPrimary: b.colorPrimary,
      ...(b.colorAccent ? { colorAccent: b.colorAccent } : {}),
      supportEmail: b.supportEmail || null,
      homepageUrl: b.homepageUrl || null,
    }),
  );
}
