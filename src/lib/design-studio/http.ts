import type { User } from "@prisma/client";
import { getCurrentUser } from "../auth";
import { NotFound } from "./store";
import { requestTranslator } from "../ai/i18n";

type Handler<T> = (user: User) => Promise<T>;

/**
 * Runs a Designer API handler for the signed-in user: 401 when signed out,
 * 404 for designs that aren't theirs, and the error's own plain words (400)
 * for anything the user can fix.
 */
export async function withUser<T>(handler: Handler<T>): Promise<Response> {
  const user = await getCurrentUser();
  const t = await requestTranslator("designer");
  if (!user) return Response.json({ error: t("server.signIn") }, { status: 401 });
  try {
    const result = await handler(user);
    return result instanceof Response ? result : Response.json(result ?? { ok: true });
  } catch (err) {
    if (err instanceof NotFound) return Response.json({ error: t("server.notFound") }, { status: 404 });
    const message = err instanceof Error ? err.message : t("server.error");
    return Response.json({ error: message.length > 300 ? t("server.tryAgain") : message }, { status: 400 });
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  return ((await req.json().catch(() => ({}))) ?? {}) as T;
}
