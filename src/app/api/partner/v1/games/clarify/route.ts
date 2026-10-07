import { isLocale } from "@/i18n/locales";
import { localeForUser } from "@/i18n/server-locale";
import { clarifyGame } from "@/lib/game-studio/engine";
import { hitLimit } from "@/lib/rate-limit";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedUser } from "@/lib/partner/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Game Studio's quick questions before a first build: up to 3, when the
 * idea leaves big choices open (none when it doesn't). Not charged; 20 an
 * hour per person, as in the studio (over that: no questions). Append the
 * answers to the prompt ("<question> <answer>" lines) for POST /games, or
 * skip them: the build never waits for answers.
 */
export const POST = partnerRoute({ permission: "build", limit: "clarify" }, async (ctx) => {
  const body = ctx.body();
  const user = await scopedUser(ctx.key, body.userId);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  if (typeof body.prompt !== "string" || body.prompt.trim().length < 3 || body.prompt.length > 6000) throw new PartnerError(400, "invalid_request", ctx.t("invalidPrompt"));
  if (body.locale !== undefined && body.locale !== null && !isLocale(body.locale)) throw new PartnerError(400, "invalid_request", ctx.t("invalidLocale"));
  if (!hitLimit(`game-clarify:${user.id}`, 20, 60 * 60_000).ok) return ok({ questions: [] });
  const locale = isLocale(body.locale) ? body.locale : await localeForUser(user);
  const { questions } = await clarifyGame(body.prompt.slice(0, 4000), locale).catch(() => ({ questions: [] }));
  return ok({ questions: questions.map((q) => ({ id: q.id, label: q.label, options: q.options ?? [] })) });
});
