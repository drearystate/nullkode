import { NextResponse } from "next/server";
import { isInstallComplete, isInstallOwner, markInstallComplete } from "@/lib/install";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
export const runtime = "nodejs";
export async function POST() {
  const t = await getTranslations({ locale: await requestLocale(), namespace: "install.api" });
  if (await isInstallComplete()) return NextResponse.json({ error: t("complete") }, { status: 409 });
  if (!(await isInstallOwner())) return NextResponse.json({ error: t("signIn") }, { status: 403 });
  await markInstallComplete();
  return NextResponse.json({ ok: true });
}
