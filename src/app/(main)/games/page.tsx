import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { aiReady } from "@/lib/ai/client";
import { gamesAvailable } from "@/lib/game-studio/kits";
import { TopBar } from "@/components/top-bar";
import { GamesHome } from "@/components/game-studio/games-home";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("games");
  return { title: t("title") };
}

export default async function GamesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("games");
  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user}><span className="studio-workspace-label">{t("title")}</span></TopBar>
      <GamesHome available={gamesAvailable()} aiReady={await aiReady()} />
    </main>
  );
}
