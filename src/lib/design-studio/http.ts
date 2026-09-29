import type { User } from "@prisma/client";
import { getCurrentUser } from "../auth";
import { NotFound } from "./store";

type Handler<T> = (user: User) => Promise<T>;

/**
 * Runs a Designer API handler for the signed-in user: 401 when signed out,
 * 404 for designs that aren't theirs, and the error's own plain words (400)
 * for anything the user can fix.
 */
export async function withUser<T>(handler: Handler<T>): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  try {
    const result = await handler(user);
    return result instanceof Response ? result : Response.json(result ?? { ok: true });
  } catch (err) {
    if (err instanceof NotFound) return Response.json({ error: "Design not found." }, { status: 404 });
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return Response.json({ error: message.length > 300 ? "Something went wrong. Please try again." : message }, { status: 400 });
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  return ((await req.json().catch(() => ({}))) ?? {}) as T;
}
