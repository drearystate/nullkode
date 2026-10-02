import { z } from "zod";
import type { User } from "@prisma/client";
import { getRealUser } from "@/lib/auth";
import { ownedProject } from "@/lib/guard";
import { deleteAccountUrl, eraseUser } from "@/lib/app-account-data";
import {
  PRIVACY_REQUEST_TYPES,
  listPrivacyRequests,
  listQueuedDeletions,
  recordPrivacyRequest,
  removePrivacyRequest,
  setPrivacyRequestDone,
  takeQueuedDeletion,
} from "@/lib/privacy-store";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { requestErrorsT } from "@/lib/errors-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(fallback: User): Promise<string> {
  const real = (await getRealUser()) ?? fallback;
  return real.name?.trim() || real.email;
}

/**
 * The app's privacy request log (type, received, due in 30 days, done, by
 * whom; never the person's details) and the signed-out deletion requests
 * waiting for approval. Owner only; anyone else gets 404.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const [requests, queued, url] = await Promise.all([
    listPrivacyRequests(id),
    listQueuedDeletions(id),
    r.project.published ? deleteAccountUrl(r.project).catch(() => null) : Promise.resolve(null),
  ]);
  return json({ requests, queued, deleteAccountUrl: url });
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("log"),
    type: z.enum(PRIVACY_REQUEST_TYPES),
    /** The day it arrived (YYYY-MM-DD); today when left out. */
    receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({ action: z.literal("done"), id: z.string().max(40), done: z.boolean() }),
  z.object({ action: z.literal("remove"), id: z.string().max(40) }),
  z.object({ action: z.literal("approve"), queueId: z.string().max(40) }),
  z.object({ action: z.literal("dismiss"), queueId: z.string().max(40) }),
]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "data.api" });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("invalidRequest") }, { status: 400 });
  const body = parsed.data;
  const by = await handler(r.user);

  switch (body.action) {
    case "log": {
      const received = body.receivedOn ? new Date(`${body.receivedOn}T12:00:00Z`) : new Date();
      if (Number.isNaN(received.getTime()) || received.getTime() > Date.now() + 86_400_000) {
        return json({ error: t("chooseDay") }, { status: 400 });
      }
      return json({ request: await recordPrivacyRequest(id, { type: body.type, source: "owner", receivedAt: received }) });
    }
    case "done": {
      const request = await setPrivacyRequestDone(id, body.id, body.done, by);
      return request ? json({ request }) : json({ error: t("requestGone") }, { status: 404 });
    }
    case "remove": {
      return (await removePrivacyRequest(id, body.id)) ? json({ ok: true }) : json({ error: t("requestGone") }, { status: 404 });
    }
    case "approve": {
      const queued = (await listQueuedDeletions(id)).find((q) => q.id === body.queueId);
      if (!queued) return json({ error: t("alreadyHandled") }, { status: 404 });
      // Same as the person confirming the emailed link: their accounts and
      // what's tied to them go; bookings with their email are kept, blanked.
      const result = await eraseUser(id, { email: queued.email }, { mode: "email", t: await requestErrorsT() });
      await takeQueuedDeletion(id, body.queueId);
      if (queued.requestId && (await setPrivacyRequestDone(id, queued.requestId, true, by))) return json({ result });
      await recordPrivacyRequest(id, { type: "erasure", source: "web-form", completed: true, handledBy: by });
      return json({ result });
    }
    case "dismiss": {
      const queued = await takeQueuedDeletion(id, body.queueId);
      if (!queued) return json({ error: t("alreadyHandled") }, { status: 404 });
      if (queued.requestId) await setPrivacyRequestDone(id, queued.requestId, true, `${by} (dismissed, nothing deleted)`);
      return json({ ok: true });
    }
  }
}
