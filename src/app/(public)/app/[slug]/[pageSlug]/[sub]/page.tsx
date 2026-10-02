import { notFound } from "next/navigation";
import { projectBySlug } from "@/lib/seo";
import { PublicAppPage, publicPageMetadata } from "@/lib/public-view";

export const dynamic = "force-dynamic";

/** /app/<slug>/<language>/<page>: a page of a multilingual app in one of its languages. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string; sub: string }>;
}) {
  const p = await params;
  const project = await projectBySlug(p.slug);
  if (!project) return { title: "Not found" };
  // The live (published) page's title, not the draft's.
  return publicPageMetadata(project, [p.pageSlug, p.sub]);
}

export default async function PublicAppLanguagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; pageSlug: string; sub: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const project = await projectBySlug(p.slug);
  if (!project || !project.published) notFound();
  return <PublicAppPage project={project} route={{ kind: "path", slug: p.slug }} segments={[p.pageSlug, p.sub]} searchParams={await searchParams} />;
}
