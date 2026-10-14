import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { GameWorkspace } from "@/components/game-studio/game-workspace";
import { roleOn } from "@/lib/sharing/access";
import { copyCredit } from "@/lib/sharing/links";
import { CopyCredit, RolePill } from "@/components/sharing/role-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const found = user ? await db.gameProject.findFirst({ where: { id, deletedAt: null }, select: { id: true, ownerId: true, name: true } }) : null;
  const g = found && user && (await roleOn("game", found, user.id)) ? found : null;
  const t = await getTranslations("games");
  return { title: g?.name ? t("gameTitle", { name: g.name }) : t("title") };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const game = await db.gameProject.findFirst({ where: { id, deletedAt: null }, select: { id: true, ownerId: true, name: true } });
  // The owner and the people they invited (lib/sharing/access.ts).
  const role = game ? await roleOn("game", game, user.id) : null;
  if (!game || !role) redirect("/games");
  const owner = role === "owner" ? null : await db.user.findUnique({ where: { id: game.ownerId }, select: { name: true, email: true } });
  const credit = role === "owner" ? await copyCredit("game", game.id).catch(() => null) : null;
  const t = await getTranslations("games");
  return (
    <main className="studio-shell h-dvh overflow-hidden">
      <TopBar user={user}>
        <span className="flex min-w-0 items-center gap-3">
          <Link href={role === "owner" ? "/games" : "/dashboard#shared-with-me"} className="studio-workspace-label shrink-0 hover:text-white" data-help={t("backHelp")}>{t("title")}</Link>
          {role !== "owner" && <RolePill kind="game" id={game.id} name={game.name} role={role} owner={owner?.name?.trim() || owner?.email || ""} />}
          {credit && <CopyCredit kind="game" id={game.id} sourceName={credit.sourceName} sourceOwnerName={credit.sourceOwnerName} />}
        </span>
      </TopBar>
      <GameWorkspace id={id} role={role} />
    </main>
  );
}
