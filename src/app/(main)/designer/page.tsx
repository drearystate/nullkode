import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { aiReady } from "@/lib/ai/client";
import { TopBar } from "@/components/top-bar";
import { DesignerHome } from "@/components/designer/designer-home";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Designer" };

export default async function DesignerPage({ searchParams }: { searchParams: Promise<{ design?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Older links opened a design with ?design=<id>.
  const { design } = await searchParams;
  if (design && /^[a-z0-9]+$/i.test(design)) redirect(`/designer/${design}`);
  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user}><span className="studio-workspace-label">AI Designer</span></TopBar>
      <DesignerHome aiReady={await aiReady()} />
    </main>
  );
}
