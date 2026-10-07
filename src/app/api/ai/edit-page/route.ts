import { z } from "zod";
import { heartbeatJson } from "@/lib/heartbeat-json";
import { aiUsageSummary, checkAiQuota, recordAiUsage, refundAiUsage, refundFailedAi } from "@/lib/ai-quota";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  editPage,
  findLostWiring,
  hasInlineScript,
  repairLostWiring,
  type EditPageResult,
  type ProjectContext,
} from "@/lib/ai/edit-page";
import {
  ensureInternalDatasource,
  persistTables,
  persistFlows,
  flowRefMap,
  resolveFlowRefsWith,
  unconnectedNote,
} from "@/lib/ai/apply-scaffold";
import { isNoOpEdit } from "@/lib/ai/html-diff";
import { json } from "@/lib/utils";
import type { ProjectTheme } from "@/lib/theme";
import { aiErrorFor, aiErrorWords, classifyAiFailure } from "@/lib/ai/errors";
import { personLocale, translator } from "@/lib/ai/i18n";
import { getAppLocale } from "@/lib/app-locale";
import { pageSourceHash } from "@/lib/app-translations";
import { isLocale } from "@/i18n/locales";
import { appSummary, refusalResponse, withBuildPolicy } from "@/lib/ai/build-policy";

export const runtime = "nodejs";
// Give the model room to think when it has to add tables + flows + HTML.
export const maxDuration = 240;

// No application/pdf: the Claude CLI silently drops PDF document blocks
// and there is no cross-provider fallback — reject at the boundary.
const ALLOWED_MEDIA = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

const Body = z.object({
  projectId: z.string().min(1),
  pageId: z.string().min(1),
  message: z.string().min(2).max(2000),
  // Transport-level ceilings only — real size policy is enforced after
  // parse with human-readable errors (see MAX_MODEL_HTML below). Cloned
  // sites routinely carry 200KB+ stylesheets and half-MB pages.
  currentHtml: z.string().max(2_000_000),
  currentCss: z.string().max(1_000_000),
  // Recent chat turns, oldest first. Lets follow-ups ("did you do X?",
  // "make it bigger") make sense — each edit call is otherwise stateless.
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(2000),
      })
    )
    .max(10)
    .optional()
    .default([]),
  attachments: z
    .array(
      z.object({
        name: z.string().max(200),
        mediaType: z.enum(ALLOWED_MEDIA),
        // base64 data URLs ~ 4/3 raw size; cap matches client (5MB raw → ~7MB).
        dataUrl: z
          .string()
          .max(8 * 1024 * 1024)
          .refine((s) => s.startsWith("data:"), "must be a data URL"),
      })
    )
    .max(4)
    .optional()
    .default([]),
  /** A multilingual app's page in one of its other languages (the editor's language tab). */
  lang: z.string().max(16).optional(),
});

type TableFieldRow = { name?: unknown; type?: unknown };
type TableSchemaShape = { fields?: TableFieldRow[] };

// A long edit outlives the proxies' idle timeout: keep the answer alive
// (lib/heartbeat-json.ts) so the browser gets the result, not a proxy error.
export async function POST(req: Request) {
  return heartbeatJson(() => handle(req));
}

async function handle(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  const locale = await personLocale();
  const t = translator(locale, "ai");
  if (!user) return json({ error: t("errors.unauthorized") }, { status: 401 });
  const quota = await checkAiQuota(user);
  if (quota) return quota;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path?.join(".") || "request";
    return json(
      { error: t("errors.invalidInputAt", { where, issue: issue?.message ?? "unknown" }) },
      { status: 400 }
    );
  }

  const {
    projectId,
    pageId,
    message,
    currentHtml,
    currentCss,
    attachments,
    history,
    lang,
  } = parsed.data;

  // Size policy with honest errors. HTML must go to the model in full (it
  // returns the complete page, and the wiring guard diffs it), so there is
  // a hard ceiling. CSS is different: giant stylesheets (cloned sites ship
  // 200KB+) are omitted from the model and preserved verbatim instead —
  // content/structure edits don't need them.
  const MAX_MODEL_HTML = 400_000; // ~100K tokens, fits the context with room
  if (currentHtml.length > MAX_MODEL_HTML) {
    return json(
      {
        error: t("edit.pageTooLarge", { size: Math.round(currentHtml.length / 1024), limit: Math.round(MAX_MODEL_HTML / 1024) }),
      },
      { status: 400 }
    );
  }
  const MAX_MODEL_CSS = 60_000;
  const cssOmitted = currentCss.length > MAX_MODEL_CSS;

  // Ownership check — we need the page, the project (for theme), and the
  // full project context (tables, flows, other pages) so the AI knows what
  // it's allowed to reuse vs. what it needs to create fresh.
  const page = await db.page.findFirst({
    where: {
      id: pageId,
      projectId,
      project: { ownerId: user.id },
    },
    include: { project: { select: { theme: true } } },
  });
  if (!page) return json({ error: t("errors.pageNotFound") }, { status: 404 });
  // Editing the page in one of a multilingual app's other languages.
  const appLanguages = await getAppLocale(projectId).catch(() => null);
  const variant = isLocale(lang) && appLanguages && lang !== appLanguages.locale && appLanguages.locales.includes(lang) ? lang : null;

  const [existingTables, existingFlows, existingPages] = await Promise.all([
    db.dataTable.findMany({
      where: { datasource: { projectId } },
      select: { name: true, schema: true },
    }),
    db.flow.findMany({
      where: { projectId },
      select: { slug: true, name: true, graph: true },
    }),
    db.page.findMany({
      where: { projectId },
      // html is needed by the wiring guard when the AI edits sibling pages;
      // html+css also go to the AI for pages the instruction names.
      select: { slug: true, title: true, html: true, css: true },
    }),
  ]);

  // Pages the instruction explicitly names ("on the about page…") get their
  // full HTML/CSS included in the AI context, so the AI can edit them via
  // pageEdits without the user switching tabs. Matching is deliberately
  // loose (slug, slug-with-spaces, or title as a whole word) — a false
  // positive only costs context tokens, a false negative makes the AI ask
  // the user to open the page.
  const msgLower = message.toLowerCase();
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isNamedInMessage = (p: { slug: string; title: string }) => {
    if (p.slug === page.slug) return false;
    const names = [p.slug, p.slug.replace(/-/g, " "), p.title.toLowerCase()];
    return names.some(
      (n) => n.length > 1 && new RegExp(`\\b${escapeRe(n)}\\b`).test(msgLower)
    );
  };
  // "All pages" style requests ("uniform navigation on every page",
  // "site-wide dark mode") need the AI to see every sibling page, not just
  // pages named individually.
  const ALL_PAGES_RE =
    /\b(all|every|each)\s+(of\s+)?(the\s+)?(other\s+)?pages?\b|\bsite[- ]?wide\b|\b(whole|entire)\s+(site|app|project|website)\b|\bacross\s+(the\s+)?(site|app|project|website|pages)\b/;
  const allPages = ALL_PAGES_RE.test(msgLower);

  const MAX_NAMED_PAGES = allPages ? 10 : 4;
  const MAX_NAMED_HTML = 80_000;
  const namedSlugs = new Set(
    existingPages
      .filter((p) =>
        allPages ? p.slug !== page.slug : isNamedInMessage(p)
      )
      .slice(0, MAX_NAMED_PAGES)
      .map((p) => p.slug)
  );

  // An app's behaviour (a game's loop, rules, controls and drawing) lives in
  // the inline <script> of the page that runs it. When the open page has no
  // code of its own, the pages that do go to the AI in full as well, so a
  // request like "add a minimap" asked from the How to Play page changes the
  // game itself through pageEdits instead of finding nothing to change here.
  const MAX_CODE_PAGES = 2;
  const MAX_CODE_HTML = 150_000;
  const codeSlugs = new Set(
    hasInlineScript(currentHtml)
      ? []
      : existingPages
          .filter((p) => p.slug !== page.slug && hasInlineScript(p.html) && p.html.length <= MAX_CODE_HTML)
          .sort((a, b) => b.html.length - a.html.length)
          .slice(0, MAX_CODE_PAGES)
          .map((p) => p.slug)
  );

  const context: ProjectContext = {
    tables: existingTables.map((t) => {
      const s = (t.schema as TableSchemaShape) ?? {};
      return {
        name: t.name,
        fields: (s.fields ?? [])
          .map((f) => ({
            name: typeof f.name === "string" ? f.name : "",
            type: typeof f.type === "string" ? f.type : "text",
          }))
          .filter((f) => f.name),
      };
    }),
    flows: existingFlows.map((f) => ({
      slug: f.slug,
      name: f.name,
      // Flow purpose isn't stored in the DB — fall back to the name so the
      // AI at least sees what the flow is broadly for. Good enough for the
      // "don't recreate login when it already exists" check.
      purpose: f.name,
    })),
    // A page goes in whole or not at all: the AI rewrites the pages it edits
    // in full, so a cut-off copy would be saved as a cut-off page.
    pages: existingPages.map((p) =>
      codeSlugs.has(p.slug) || (namedSlugs.has(p.slug) && p.html.length <= MAX_NAMED_HTML)
        ? {
            slug: p.slug,
            title: p.title,
            html: p.html,
            css: p.css ?? "",
            ...(codeSlugs.has(p.slug) ? { code: true } : {}),
          }
        : { slug: p.slug, title: p.title }
    ),
  };

  // Charged before the AI runs (so parallel requests can't pass the limit);
  // every failure below gives the action back.
  const chargeId = await recordAiUsage(user.id, "edit", page.projectId);
  const usage = () => aiUsageSummary(user).catch(() => null);
  const fail = async (err: unknown, fallback: string) => {
    const refunded = await refundFailedAi(chargeId, user.id, classifyAiFailure(err));
    return json(
      { error: aiErrorFor(user, err, fallback, aiErrorWords(t)), refunded, usage: await usage() },
      { status: 500 }
    );
  };

  // The build rule (lib/ai/build-policy.ts), checked alongside the edit: this
  // request together with what the app is so far (an edit can add whole
  // features). A refusal charges nothing.
  const policySubject = {
    kind: "edit" as const,
    request: message,
    earlier: history.filter((h) => h.role === "user").slice(-4).map((h) => h.text).join(" | "),
    app: await appSummary(projectId),
  };
  let result: EditPageResult;
  try {
    const checked = await withBuildPolicy(policySubject, { userId: user.id, locale, projectId }, async () => editPage({
      currentHtml,
      currentCss: cssOmitted ? "" : currentCss,
      cssOmitted,
      message,
      pageTitle: page.title,
      pageSlug: page.slug,
      theme: (page.project.theme as ProjectTheme | null) ?? null,
      context,
      attachments,
      history,
      locale,
      // The app's language, when it has one: the page's text stays in it.
      contentLocale: variant ?? (await getAppLocale(page.projectId).then((a) => (a.explicit ? a.locale : undefined), () => undefined)),
    }));
    if ("refused" in checked) {
      await refundAiUsage(chargeId);
      return refusalResponse(checked.refused, { usage: await usage() });
    }
    result = checked.value;
  } catch (err) {
    return fail(err, t("edit.failed"));
  }

  // Nothing changed and nothing was added: say so honestly, and give the
  // action back (a question answered without changes is not this case).
  if (
    isNoOpEdit({
      message,
      before: { html: currentHtml, css: currentCss },
      after: { html: result.html ?? "", css: result.css ?? "" },
      compareCss: !cssOmitted,
      otherWork: (result.newTables?.length ?? 0) > 0 || (result.newFlows?.length ?? 0) > 0 || (result.pageEdits?.length ?? 0) > 0,
    })
  ) {
    const refunded = await refundFailedAi(chargeId, user.id, "unusable");
    return json({
      html: null,
      css: null,
      explanation: refunded ? t("edit.noChangeRefunded") : t("edit.noChange"),
      noChange: true,
      refunded,
      createdTables: [],
      createdFlowSlugs: [],
      updatedPages: [],
      suggestions: [],
      usage: await usage(),
    });
  }

  try {
    // When the stylesheet was too big to show the model, its returned css is
    // meaningless — keep the page's real stylesheet byte-for-byte.
    if (cssOmitted) result = { ...result, css: currentCss };
    // A translation shares the page's styles and edits only itself.
    if (variant) result = { ...result, css: currentCss, pageEdits: [] };

    // Wiring guard: don't let the edit break existing functionality. If the
    // new HTML lost data-nk-* bindings the old HTML had, run one focused
    // repair pass that reinstates them (unless the user asked for the
    // removal). If wiring is still missing after repair — either the model
    // judged the removal intentional or the repair failed — proceed but tell
    // the user exactly what changed so nothing breaks silently.
    const userNotes: string[] = [];
    let lostWiring = findLostWiring(currentHtml, result.html);
    if (lostWiring.length > 0) {
      const repaired = await repairLostWiring({
        message,
        originalHtml: currentHtml,
        proposedHtml: result.html,
        proposedCss: result.css,
        lostWiring,
      });
      if (repaired) {
        result = { ...result, html: repaired.html, css: repaired.css };
        lostWiring = findLostWiring(currentHtml, result.html);
      }
      if (lostWiring.length > 0) {
        const shown = lostWiring.slice(0, 4).join(", ");
        userNotes.push(
          lostWiring.length > 4
            ? t("edit.lostWiringMore", { list: shown, more: lostWiring.length - 4 })
            : t("edit.lostWiring", { list: shown })
        );
      }
    }

    // Persist new backend resources before we rewrite the HTML. Order matters:
    // tables first, then flows (flows reference table names), then we can
    // rewrite flow-ref slugs to real ids in the returned HTML.
    let createdTables: string[] = [];
    const flowSlugToId = new Map<string, string>();

    try {
      if (result.newTables.length > 0 || result.newFlows.length > 0) {
        const datasource = await ensureInternalDatasource(projectId);

        if (result.newTables.length > 0) {
          createdTables = await persistTables(
            projectId,
            datasource.id,
            result.newTables
          );
        }

        if (result.newFlows.length > 0) {
          const map = await persistFlows(
            projectId,
            datasource.id,
            result.newFlows
          );
          for (const [slug, id] of map) flowSlugToId.set(slug, id);
        }
      }
    } catch (err) {
      return fail(err, t("edit.partsFailed"));
    }

    // Resolve every data-nk-*-ref="<slug>" (forms, lists, sign-out, kanban,
    // sortable, calendar) against ALL of the project's flows — the ones this
    // edit made win on a clash — so reusing an existing flow works too. Runs
    // on every edit, not only when flows were added.
    const refMap = await flowRefMap(projectId, flowSlugToId);
    const unconnected: string[] = [];
    const current = resolveFlowRefsWith(result.html, refMap);
    unconnected.push(...current.leftover);
    const rewrittenHtml = current.html;

    // Persist the current page server-side too. The client applies the new
    // HTML to the canvas and autosaves, but if the user switched pages (the
    // editor remounts per tab) the canvas apply is skipped — without this
    // write the whole edit would be silently lost. Clearing components/styles
    // matters: the editor prefers the components JSON over html on load, so
    // leaving the old JSON in place would show the pre-edit page.
    if (variant) {
      // The page in another language: the owner's wording from now on.
      await db.pageTranslation.upsert({
        where: { pageId_locale: { pageId, locale: variant } },
        update: { html: rewrittenHtml, origin: "edited" },
        create: { pageId, locale: variant, title: page.title, html: rewrittenHtml, origin: "edited", sourceHash: pageSourceHash(page) },
      });
    } else await db.page.update({
      where: { id: pageId },
      data: {
        html: rewrittenHtml,
        css: result.css,
        components: Prisma.DbNull,
        styles: Prisma.DbNull,
      },
    });

    // Apply pageEdits to sibling pages. The AI can only edit pages that
    // already exist — we validate each slug against the project.
    const appliedPageEdits: Array<{ slug: string; id: string }> = [];
    if (result.pageEdits.length > 0) {
      const bySlug = new Map(existingPages.map((p) => [p.slug, p]));
      for (const edit of result.pageEdits) {
        // Skip edits that target the current page — the AI is supposed to
        // use `html`/`css` for those, not pageEdits. Also skip unknown slugs.
        if (edit.pageSlug === page.slug) continue;
        const target = bySlug.get(edit.pageSlug);
        if (!target) continue;

        const sibling = resolveFlowRefsWith(edit.newHtml, refMap);
        let editHtml = sibling.html;
        let editCss = edit.newCss ?? "";

        // Wiring guard for sibling pages: the user can't see these pages
        // while the edit happens, so breaking one is worse than applying it.
        // Try the same repair pass the current page gets; if wiring is still
        // missing afterwards, skip the update and say so.
        let siblingLost = findLostWiring(target.html, editHtml);
        if (siblingLost.length > 0) {
          const repaired = await repairLostWiring({
            message,
            originalHtml: target.html,
            proposedHtml: editHtml,
            proposedCss: editCss,
            lostWiring: siblingLost,
          });
          if (repaired) {
            editHtml = repaired.html;
            editCss = repaired.css;
            siblingLost = findLostWiring(target.html, editHtml);
          }
        }
        if (siblingLost.length > 0) {
          userNotes.push(
            t("edit.skippedPage", { title: target.title, list: `${siblingLost.slice(0, 3).join(", ")}${siblingLost.length > 3 ? ", …" : ""}` })
          );
          continue;
        }

        const updated = await db.page.update({
          where: { projectId_slug: { projectId, slug: edit.pageSlug } },
          data: {
            html: editHtml,
            css: editCss,
            // The editor loads components JSON in preference to html, so a
            // stale components blob would make this edit invisible in the
            // editor even though the published page changed.
            components: Prisma.DbNull,
            styles: Prisma.DbNull,
          },
          select: { id: true, slug: true },
        });
        appliedPageEdits.push({ slug: updated.slug, id: updated.id });
        unconnected.push(...sibling.leftover);
      }
    }

    const note = unconnectedNote(unconnected, t, locale);
    if (note) userNotes.push(note);

    return json({
      html: rewrittenHtml,
      css: result.css,
      explanation:
        userNotes.length > 0
          ? `${result.explanation} ${userNotes.join(" ")}`
          : result.explanation,
      createdTables,
      createdFlowSlugs: result.newFlows.map((f) => f.slug),
      updatedPages: appliedPageEdits,
      suggestions: result.suggestions ?? [],
      usage: await usage(),
    });
  } catch (err) {
    console.error("[ai/edit-page] saving the edit failed", err);
    return fail(err, t("edit.saveFailed"));
  }
}
