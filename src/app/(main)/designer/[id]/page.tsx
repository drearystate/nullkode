import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { DesignWorkspace } from "@/components/designer/design-workspace";
import { roleOn } from "@/lib/sharing/access";
import { copyCredit } from "@/lib/sharing/links";
import { CopyCredit, RolePill } from "@/components/sharing/role-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const found = user ? await db.designerDesign.findFirst({ where: { id, deletedAt: null }, select: { id: true, userId: true, name: true } }) : null;
  const d = found && user && (await roleOn("design", { id: found.id, ownerId: found.userId }, user.id)) ? found : null;
  const t = await getTranslations("designer");
  return { title: d?.name ? t("designTitle", { name: d.name }) : t("title") };
}

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const design = await db.designerDesign.findFirst({ where: { id, deletedAt: null }, select: { id: true, userId: true, name: true } });
  // The owner and the people they invited (lib/sharing/access.ts).
  const role = design ? await roleOn("design", { id: design.id, ownerId: design.userId }, user.id) : null;
  if (!design || !role) redirect("/designer");
  const owner = role === "owner" ? null : await db.user.findUnique({ where: { id: design.userId }, select: { name: true, email: true } });
  const credit = role === "owner" ? await copyCredit("design", design.id).catch(() => null) : null;
  const t = await getTranslations("designer");
  return (
    <main className="studio-shell h-dvh overflow-hidden">
      <TopBar user={user}>
        <span className="flex min-w-0 items-center gap-3">
          <Link href={role === "owner" ? "/designer" : "/dashboard#shared-with-me"} className="studio-workspace-label shrink-0 hover:text-white" data-help={t("backHelp")}>{t("title")}</Link>
          {role !== "owner" && <RolePill kind="design" id={design.id} name={design.name} role={role} owner={owner?.name?.trim() || owner?.email || ""} />}
          {credit && <CopyCredit kind="design" id={design.id} sourceName={credit.sourceName} sourceOwnerName={credit.sourceOwnerName} />}
        </span>
      </TopBar>
      <DesignWorkspace id={id} role={role} />
    </main>
  );
}
