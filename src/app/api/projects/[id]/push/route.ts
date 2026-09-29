import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { sendPushToProject } from "@/lib/push";
import { appIconUrl } from "@/lib/app-icon";
import { appPublicUrl } from "@/lib/reseller";

const Body = z.object({
  title: z.string().trim().min(1, "Add a title.").max(120),
  body: z.string().trim().max(400).default(""),
  url: z.string().trim().max(500).optional(),
});

/** Send a push notification to everyone subscribed to this app. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the message." }, { status: 400 });
  if (!r.project.published) return json({ error: "Publish the app first — notifications open your live app." }, { status: 400 });
  // A relative link ("/menu") opens that page of the live app.
  const base = await appPublicUrl(r.project);
  const link = parsed.data.url?.trim();
  const url = !link ? base : /^https?:\/\//i.test(link) ? link : `${base}${link.startsWith("/") ? "" : "/"}${link}`;
  const result = await sendPushToProject(id, {
    title: parsed.data.title,
    body: parsed.data.body,
    url,
    icon: appIconUrl(r.project, 192),
  });
  await db.pushMessage.create({
    data: { projectId: id, title: parsed.data.title, body: parsed.data.body, url, ...result, createdBy: r.user.id },
  });
  return json(result);
}
