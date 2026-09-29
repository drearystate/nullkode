import { NextResponse } from "next/server";
import { z } from "zod";
import { isInstallComplete, isInstallOwner } from "@/lib/install";
import { updateBrand } from "@/lib/brand";

export const runtime = "nodejs";

const Body = z.object({
  appName: z.string().min(1).max(80).optional(),
  tagline: z.string().min(1).max(300).optional(),
  colorPrimary: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  colorAccent: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  logoDataUrl: z.string().max(200_000).nullable().optional(),
  faviconDataUrl: z.string().max(200_000).nullable().optional(),
});

export async function POST(req: Request) {
  if (await isInstallComplete()) {
    return NextResponse.json({ error: "install already complete" }, { status: 409 });
  }
  if (!(await isInstallOwner())) return NextResponse.json({ error: "Sign in as the setup owner first." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  await updateBrand(parsed.data);
  return NextResponse.json({ ok: true });
}
