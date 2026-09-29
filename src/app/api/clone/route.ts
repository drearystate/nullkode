import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cloneSite } from "@/lib/clone-site";
import { slugify, projectSlug } from "@/lib/utils";
import { checkProjectLimit } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 800;

type Event =
  | { type: "progress"; message: string; pageCount?: number }
  | { type: "done"; projectId: string; homePageId: string; pageCount: number }
  | { type: "error"; message: string };

function encode(ev: Event) {
  return new TextEncoder().encode(`data: ${JSON.stringify(ev)}\n\n`);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const limitError = await checkProjectLimit(user);
  if (limitError) return limitError;

  let url = "";
  try {
    const body = (await req.json()) as { url?: string };
    url = (body.url ?? "").trim();
    if (!url) throw new Error();
    new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const baseSlug = slugify(hostname) || "clone";
  const newSlug = projectSlug(baseSlug);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: Event) => {
        try {
          controller.enqueue(encode(ev));
        } catch {}
      };
      // Heartbeat keeps proxies happy during long crawls
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: keep-alive\n\n`));
        } catch {}
      }, 10000);

      try {
        send({ type: "progress", message: `Connecting to ${hostname}...` });

        // Pass a progress callback through to the clone function
        const cloned = await cloneSite(url, newSlug, 30, (msg, count) => {
          send({ type: "progress", message: msg, pageCount: count });
        });

        if (cloned.pages.length === 0) {
          throw new Error("No pages could be cloned");
        }

        send({
          type: "progress",
          message: `Saving ${cloned.pages.length} pages...`,
          pageCount: cloned.pages.length,
        });

        const project = await db.project.create({
          data: {
            ownerId: user.id,
            name: cloned.title,
            slug: newSlug,
            description: `Cloned from ${hostname} (${cloned.pages.length} pages)`,
          },
        });

        let homePageId: string | null = null;
        for (const p of cloned.pages) {
          const created = await db.page.create({
            data: {
              projectId: project.id,
              title: p.title,
              slug: p.slug,
              isHome: p.isHome,
              html: p.html,
              css: p.css,
            },
          });
          if (p.isHome) homePageId = created.id;
        }

        if (!homePageId) {
          const first = await db.page.findFirst({
            where: { projectId: project.id },
            orderBy: { createdAt: "asc" },
          });
          if (first) {
            await db.page.update({ where: { id: first.id }, data: { isHome: true } });
            homePageId = first.id;
          }
        }

        send({
          type: "done",
          projectId: project.id,
          homePageId: homePageId!,
          pageCount: cloned.pages.length,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Clone failed",
        });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
