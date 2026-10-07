import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { GameWorkspace } from "@/components/game-studio/game-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const g = user ? await db.gameProject.findFirst({ where: { id, ownerId: user.id, deletedAt: null }, select: { name: true } }) : null;
  const t = await getTranslations("games");
  return { title: g?.name ? t("gameTitle", { name: g.name }) : t("title") };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const game = await db.gameProject.findFirst({ where: { id, ownerId: user.id, deletedAt: null }, select: { id: true } });
  if (!game) redirect("/games");
  const t = await getTranslations("games");
  return (
    <main className="studio-shell h-dvh overflow-hidden">
      <TopBar user={user}>
        <Link href="/games" className="studio-workspace-label hover:text-white" data-help={t("backHelp")}>{t("title")}</Link>
      </TopBar>
      <GameWorkspace id={id} />
    </main>
  );
}
