import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { noteServedHost, projectForHostRequest } from "@/lib/app-hosts";
import { PublicAppPage, publicPageMetadata } from "@/lib/public-view";

export const dynamic = "force-dynamic";

/** <domain>/<language>/<page>: a page of a multilingual app in one of its languages. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string; pageSlug: string; sub: string }>;
}) {
  const p = await params;
  const project = await projectForHostRequest(p.host);
  if (!project) return { title: "Not found" };
  // The live (published) page's title, not the draft's.
  return publicPageMetadata(project, [p.pageSlug, p.sub]);
}

export default async function HostLanguagePage({
  params,
  searchParams,
}: {
  params: Promise<{ host: string; pageSlug: string; sub: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const project = await projectForHostRequest(p.host);
  if (!project || !project.published) notFound();
  // Remember that this domain works (lib/app-hosts.ts); the page then sends
  // visitors on a second address to the app's primary one.
  await noteServedHost(project.id, p.host, await headers());
  return <PublicAppPage project={project} route={{ kind: "host", host: p.host }} segments={[p.pageSlug, p.sub]} searchParams={await searchParams} />;
}
