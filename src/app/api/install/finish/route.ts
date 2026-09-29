import { NextResponse } from "next/server";
import { isInstallComplete, isInstallOwner, markInstallComplete } from "@/lib/install";
export const runtime = "nodejs";
export async function POST() {
  if (await isInstallComplete()) return NextResponse.json({ error: "Setup is already complete." }, { status: 409 });
  if (!(await isInstallOwner())) return NextResponse.json({ error: "Sign in as the setup owner first." }, { status: 403 });
  await markInstallComplete();
  return NextResponse.json({ ok: true });
}
