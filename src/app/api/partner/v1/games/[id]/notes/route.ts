import { localeForUser } from "@/i18n/server-locale";
import { addNote } from "@/lib/game-studio/notes";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { gameCall, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long a note waits for its immediate answer by default. */
const REPLY_WAIT_MS = 30_000;

/**
 * Steer while building: a note on the running build or change ({text,
 * images?}), as if the person typed it in the workspace's chat. The build
 * rule checks it, the AI answers it at once (returned as `reply` unless
 * `wait: false`), and the build takes it in before its next step. Not
 * charged (images sent with a note are read as one AI action, as in the
 * studio). 409 not_running when nothing is running: send a change instead.
 */
export const POST = partnerRoute<{ id: string }>({ permission: "build", idempotent: true, limit: "notes" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const body = ctx.body();
  if (body.text !== undefined && body.text !== null && typeof body.text !== "string") throw new PartnerError(400, "invalid_request", ctx.t("invalidNote"));
  if (body.wait !== undefined && typeof body.wait !== "boolean") throw new PartnerError(400, "invalid_request", ctx.t("invalidWait"));
  const locale = await localeForUser(game.owner);
  const note = await gameCall(ctx, () =>
    addNote(game.owner, game.id, typeof body.text === "string" ? body.text : "", { images: body.images, locale, waitMs: body.wait === false ? 0 : REPLY_WAIT_MS }),
  );
  ctx.audit.noteId = note.id;
  return ok({ note: { id: note.id, status: note.status, chatSeq: note.chatSeq, reply: note.reply ?? null } }, 201);
});
