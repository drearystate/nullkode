import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { DesignWorkspace } from "@/components/designer/design-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await db.designerDesign.findUnique({ where: { id }, select: { name: true } });
  return { title: d?.name ? `${d.name} · AI Designer` : "AI Designer" };
}

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const design = await db.designerDesign.findFirst({ where: { id, userId: user.id, deletedAt: null }, select: { id: true } });
  if (!design) redirect("/designer");
  return (
    <main className="studio-shell h-dvh overflow-hidden">
      <TopBar user={user}>
        <Link href="/designer" className="studio-workspace-label hover:text-white" data-help="Go back to the AI Designer home to see all your designs or start a new one.">AI Designer</Link>
      </TopBar>
      <DesignWorkspace id={id} />
    </main>
  );
}
