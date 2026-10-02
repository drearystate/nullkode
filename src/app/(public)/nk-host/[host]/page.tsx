import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { noteServedHost, projectForHostRequest } from "@/lib/app-hosts";
import { PublicAppPage, publicPageMetadata } from "@/lib/public-view";

export const dynamic = "force-dynamic";

/** <the app's own domain>/: its home page (lib/public-view.tsx). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}) {
  const p = await params;
  const project = await projectForHostRequest(p.host);
  if (!project) return { title: "Not found" };
  // The live (published) page's title, not the draft's.
  return publicPageMetadata(project, []);
}

export default async function HostHome({
  params,
  searchParams,
}: {
  params: Promise<{ host: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const project = await projectForHostRequest(p.host);
  if (!project || !project.published) notFound();
  // Remember that this domain works (lib/app-hosts.ts); the page then sends
  // visitors on a second address to the app's primary one.
  await noteServedHost(project.id, p.host, await headers());
  return <PublicAppPage project={project} route={{ kind: "host", host: p.host }} segments={[]} searchParams={await searchParams} />;
}
