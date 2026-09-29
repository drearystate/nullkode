import { z } from "zod";
import { checkAiQuota, recordAiUsage } from "@/lib/ai-quota";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  editPage,
  findLostWiring,
  repairLostWiring,
  type ProjectContext,
} from "@/lib/ai/edit-page";
import {
  ensureInternalDatasource,
  persistTables,
  persistFlows,
  rewriteFlowRefsInHtml,
} from "@/lib/ai/apply-scaffold";
import { json } from "@/lib/utils";
import type { ProjectTheme } from "@/lib/theme";
import { aiErrorFor } from "@/lib/ai/errors";

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
});

type TableFieldRow = { name?: unknown; type?: unknown };
type TableSchemaShape = { fields?: TableFieldRow[] };

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const quota = await checkAiQuota(user);
  if (quota) return quota;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path?.join(".") || "request";
    return json(
      { error: `Invalid input (${where}: ${issue?.message ?? "unknown"})` },
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
        error:
          `This page is too large for the AI editor — its HTML is ` +
          `${Math.round(currentHtml.length / 1024)}KB (limit ` +
          `${Math.round(MAX_MODEL_HTML / 1024)}KB). Try the edit on a ` +
          `smaller page, or ask me to trim this one down first.`,
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
  if (!page) return json({ error: "Page not found" }, { status: 404 });

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
    pages: existingPages.map((p) =>
      namedSlugs.has(p.slug)
        ? {
            slug: p.slug,
            title: p.title,
            html: p.html.slice(0, MAX_NAMED_HTML),
            css: p.css ?? "",
          }
        : { slug: p.slug, title: p.title }
    ),
  };

  let result;
  try {
    await recordAiUsage(user.id, "edit", page.projectId);
    result = await editPage({
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
    });
  } catch (err) {
    return json(
      { error: aiErrorFor(user, err, "The AI couldn't change this page. Please try again.") },
      { status: 500 }
    );
  }

  // When the stylesheet was too big to show the model, its returned css is
  // meaningless — keep the page's real stylesheet byte-for-byte.
  if (cssOmitted) result = { ...result, css: currentCss };

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
      const more = lostWiring.length > 4 ? ` and ${lostWiring.length - 4} more` : "";
      userNotes.push(
        `Note: this change removed some existing wiring (${shown}${more}). If that wasn't intended, use undo (Ctrl+Z) or tell me to restore it.`
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
    return json(
      {
        error: aiErrorFor(user, err, "The AI couldn't add the parts behind this page. Please try again."),
      },
      { status: 500 }
    );
  }

  // Rewrite current-page HTML so data-nk-flow-ref="save-location" becomes
  // data-nk-flow="<real-id>". Safe to run even when no new flows were
  // created — it's a no-op on an empty map.
  const rewrittenHtml =
    flowSlugToId.size > 0
      ? rewriteFlowRefsInHtml(result.html, flowSlugToId)
      : result.html;

  // Persist the current page server-side too. The client applies the new
  // HTML to the canvas and autosaves, but if the user switched pages (the
  // editor remounts per tab) the canvas apply is skipped — without this
  // write the whole edit would be silently lost. Clearing components/styles
  // matters: the editor prefers the components JSON over html on load, so
  // leaving the old JSON in place would show the pre-edit page.
  await db.page.update({
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

      let editHtml =
        flowSlugToId.size > 0
          ? rewriteFlowRefsInHtml(edit.newHtml, flowSlugToId)
          : edit.newHtml;
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
          `Skipped updating "${target.title}" — the proposed change would have removed working functionality there (${siblingLost.slice(0, 3).join(", ")}${siblingLost.length > 3 ? ", …" : ""}). Open that page and ask me there if you still want it changed.`
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
    }
  }

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
  });
}
