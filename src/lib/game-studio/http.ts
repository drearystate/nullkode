import type { User } from "@prisma/client";
import { getCurrentUser } from "../auth";
import { requestTranslator } from "../ai/i18n";
import { NotFound } from "./store";
import { ReferenceImageError } from "../ai/references";
import { BuildNotAllowedError } from "../ai/build-policy";

/**
 * Runs a Game Studio API handler for the signed-in user: 401 when signed
 * out, 404 for games that aren't theirs, the build rule's refusal (422,
 * build_not_allowed), reference image problems with their code, and the
 * error's own plain words (400) for anything the person can fix.
 */
export async function withGameUser<T>(handler: (user: User) => Promise<T>): Promise<Response> {
  const user = await getCurrentUser();
  const t = await requestTranslator("games");
  if (!user) return Response.json({ error: t("server.signIn") }, { status: 401 });
  try {
    const result = await handler(user);
    return result instanceof Response ? result : Response.json(result ?? { ok: true });
  } catch (err) {
    if (err instanceof NotFound) return Response.json({ error: t("server.notFound") }, { status: 404 });
    if (err instanceof ReferenceImageError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof BuildNotAllowedError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    const message = err instanceof Error ? err.message : t("server.error");
    if (!(err instanceof Error) || message.length > 300) console.error("[game-studio]", err);
    return Response.json({ error: message.length > 300 ? t("server.tryAgain") : message }, { status: 400 });
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  return ((await req.json().catch(() => ({}))) ?? {}) as T;
}
