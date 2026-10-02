import { createHash } from "node:crypto";
import { Pool } from "pg";
import { db } from "./db";
import { getAppLocale, setAppLocales, type AppLocale } from "./app-locale";
import { localizeHtmlDetailed, localizeStrings, mapLimit } from "./i18n-content";
import { syncProjectNav } from "./nav-sync";
import { getModule } from "./modules/registry";
import { projectSchemaName } from "./datasources/postgres";
import { LOCALES, type Locale } from "@/i18n/locales";

/**
 * Multilingual apps: one app, several languages, a switcher for visitors.
 *
 * The app's default language lives in its pages as always; each other
 * language (Setting `locale:<id>` → locales, lib/app-locale.ts) gets a
 * PageTranslation per page, made by the AI (localizeHtml: structure, wiring
 * and placeholders guaranteed unchanged) and editable in the editor. CSS is
 * shared. A translation remembers the page it was made from (sourceHash, the
 * shared menu left out); when the page changes it needs updating ("stale").
 * Publishing freezes translations with the pages (lib/deployments.ts).
 *
 * Visitors reach a language at /<code>/<page> after the app's base; the
 * default language keeps its plain addresses. Built-in emails and messages
 * of features (modules) get a variant per language (subject_i18n, body_i18n
 * on email and response steps), picked by the recipient's saved language
 * (auth_users.locale) or the visitor's.
 */

const NAV_RE = /<nav\b[^>]*\bdata-nk-nav\b[^>]*>[\s\S]*?<\/nav>/i;
const NAV_PLACEHOLDER = '<nav data-nk-nav="auto"></nav>';

/** A page's HTML without its shared menu (stamped back by nav-sync in each language). */
export function withoutMenu(html: string): string {
  return html.replace(NAV_RE, NAV_PLACEHOLDER);
}

/** Fingerprint of what a translation is made from: the page's title and HTML, menu left out. */
export function pageSourceHash(page: { title: string; html: string }): string {
  return createHash("sha1").update(`${page.title}\n${withoutMenu(page.html)}`).digest("hex");
}

export type TranslationState = "ok" | "stale" | "missing" | "edited";

export function translationState(page: { title: string; html: string }, t: { sourceHash: string; origin: string } | undefined): TranslationState {
  if (!t) return "missing";
  if (t.sourceHash === pageSourceHash(page)) return "ok";
  return t.origin === "edited" ? "edited" : "stale";
}

const LANGUAGE_SLUGS = new Set(LOCALES.map((l) => l.code.toLowerCase()));

/** Whether a page slug is a language code (those addresses belong to the languages). */
export function isLanguageSlug(slug: string): boolean {
  return LANGUAGE_SLUGS.has(slug.toLowerCase());
}

/** The language a URL segment names ("pt-br" → "pt-BR"), if any. */
export function languageOfSlug(slug: string): Locale | null {
  const s = slug.toLowerCase();
  return LOCALES.find((l) => l.code.toLowerCase() === s)?.code ?? null;
}

/* ── Translating pages ─────────────────────────────────────────────────── */

type SourcePage = { id: string; title: string; html: string };

/**
 * One page in one language, made by the AI and saved. Returns false (and
 * saves nothing) when the AI isn't set up or its answer changed anything
 * but words; the page then shows in the default language until it's done.
 */
export async function translatePage(page: SourcePage, locale: Locale): Promise<{ ok: boolean; problem?: string }> {
  const source = withoutMenu(page.html);
  const [out, titles] = await Promise.all([localizeHtmlDetailed(source, locale), localizeStrings({ title: page.title }, locale)]);
  const nothing = out.problem === "nothing to translate";
  if (!out.translated && !nothing) return { ok: false, problem: out.problem };
  const data = { title: titles.title || page.title, html: nothing ? source : out.html, sourceHash: pageSourceHash(page), origin: "ai" };
  await db.pageTranslation.upsert({
    where: { pageId_locale: { pageId: page.id, locale } },
    update: data,
    create: { pageId: page.id, locale, ...data },
  });
  return { ok: true };
}

export type TranslateJob = { locale: Locale; total: number; done: number; failed: number; running: boolean; startedAt: number; finishedAt?: number };
const jobs = new Map<string, TranslateJob>();

/** The background translation running (or last run) for an app's language. */
export function translateJob(projectId: string, locale: string): TranslateJob | null {
  return jobs.get(`${projectId}:${locale}`) ?? null;
}

/**
 * Translates an app's pages into one of its languages: the ones missing or
 * out of date (all with `force`; pages the owner edited in that language
 * only with `force`), or just `pageIds`. Then stamps each language's menu.
 */
export async function translateApp(projectId: string, locale: Locale, opts: { pageIds?: string[]; force?: boolean } = {}): Promise<TranslateJob> {
  const key = `${projectId}:${locale}`;
  const running = jobs.get(key);
  if (running?.running) return running;
  // Registered before anything else, so the status shows it at once.
  const job: TranslateJob = { locale, total: 0, done: 0, failed: 0, running: true, startedAt: Date.now() };
  jobs.set(key, job);
  try {
    return await runTranslation(projectId, locale, opts, job);
  } finally {
    job.running = false;
    job.finishedAt = Date.now();
  }
}

async function runTranslation(projectId: string, locale: Locale, opts: { pageIds?: string[]; force?: boolean }, job: TranslateJob): Promise<TranslateJob> {
  const pages = await db.page.findMany({
    where: { projectId, ...(opts.pageIds ? { id: { in: opts.pageIds } } : {}) },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, html: true, translations: { where: { locale }, select: { sourceHash: true, origin: true } } },
  });
  const todo = pages.filter((p) => {
    const state = translationState(p, p.translations[0]);
    return opts.force || opts.pageIds ? true : state === "missing" || state === "stale";
  });
  job.total = todo.length;
  await mapLimit(todo, 3, async (p) => {
    const r = await translatePage(p, locale).catch((err) => ({ ok: false, problem: String(err) }));
    if (r.ok) job.done++;
    else job.failed++;
  });
  if (job.done > 0) await syncProjectNav(projectId).catch((err) => console.error("[translations] menu sync failed:", err));
  return job;
}

/** translateApp in the background (the request returns at once; the status shows progress). */
export function startTranslating(projectId: string, locale: Locale, opts: { pageIds?: string[]; force?: boolean } = {}): void {
  void translateApp(projectId, locale, opts).catch((err) => console.error(`[translations] ${projectId} ${locale}:`, err));
}

/* ── Adding and removing languages ─────────────────────────────────────── */

/**
 * Adds a language to an app: pages whose address is that language's code
 * move aside ("es" → "es-page"), visitors' saved language gets a column,
 * module flows get their built-in texts in it, the menu gets a switcher, and
 * the pages are translated in the background.
 */
export async function addAppLanguage(projectId: string, locale: Locale, opts: { background?: boolean } = {}): Promise<AppLocale> {
  const app = await getAppLocale(projectId);
  if (app.locales.includes(locale)) return app;
  await freeLanguageSlug(projectId, locale);
  const next = await setAppLocales(projectId, [...app.locales.slice(1), locale]);
  await ensureVisitorLocale(projectId).catch((err) => console.error("[translations] visitor language column:", err));
  await translateModuleFlows(projectId, [locale]).catch((err) => console.error("[translations] module flows:", err));
  await syncProjectNav(projectId).catch(() => 0);
  if (opts.background === false) await translateApp(projectId, locale);
  else startTranslating(projectId, locale);
  return next;
}

/** Removes one of an app's other languages and its translations. */
export async function removeAppLanguage(projectId: string, locale: Locale): Promise<AppLocale> {
  const app = await getAppLocale(projectId);
  const next = await setAppLocales(projectId, app.locales.slice(1).filter((c) => c !== locale));
  await db.pageTranslation.deleteMany({ where: { locale, page: { projectId } } });
  await syncProjectNav(projectId).catch(() => 0);
  return next;
}

/** A page at a language's address (/es) would be hidden by it: give it another one. */
async function freeLanguageSlug(projectId: string, locale: Locale): Promise<void> {
  const slug = locale.toLowerCase();
  const page = await db.page.findFirst({ where: { projectId, slug }, select: { id: true } });
  if (!page) return;
  let next = `${slug}-page`;
  for (let n = 2; await db.page.findFirst({ where: { projectId, slug: next }, select: { id: true } }); n++) next = `${slug}-page-${n}`;
  await db.page.update({ where: { id: page.id }, data: { slug: next } });
}

/* ── New pages and features in every language ─────────────────────────── */

/**
 * Pages and flows a feature (module) just installed, in each of the app's
 * other languages: its pages translated, its built-in emails and messages
 * given a variant per language. No-op for single-language apps.
 */
export async function translateInstalled(projectId: string, pageIds: string[], flowIds: string[]): Promise<void> {
  const app = await getAppLocale(projectId);
  const others = app.locales.slice(1);
  if (others.length === 0) return;
  await translateFlowTexts(flowIds, others).catch((err) => console.error("[translations] module flows:", err));
  for (const locale of others) {
    if (pageIds.length) await translateApp(projectId, locale, { pageIds }).catch((err) => console.error("[translations] module pages:", err));
  }
}

/* ── Built-in texts of feature flows ───────────────────────────────────── */

type GraphNode = { id: string; type: string; data?: Record<string, unknown> };
type Graph = { nodes?: GraphNode[]; edges?: unknown[] };
const RESPONSE_KEYS = ["error", "message"] as const;

function parseObject(s: unknown): Record<string, unknown> | null {
  if (typeof s !== "string") return null;
  try {
    const v = JSON.parse(s) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The flows installed by the app's features (not the owner's own flows, whose words stay theirs). */
async function moduleFlowIds(projectId: string): Promise<string[]> {
  const [installed, flows] = await Promise.all([
    db.projectModule.findMany({ where: { projectId }, select: { moduleId: true } }),
    db.flow.findMany({ where: { projectId }, select: { id: true, slug: true } }),
  ]);
  const ids = new Set<string>();
  for (const { moduleId } of installed) {
    const def = getModule(moduleId);
    if (!def) continue;
    for (const f of def.flows) {
      const base = def.bareSlugs ? f.slug : `${def.id}-${f.slug}`;
      const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(-\\d+)?$`);
      for (const flow of flows) if (re.test(flow.slug)) ids.add(flow.id);
    }
  }
  return [...ids];
}

/** Gives every installed feature flow its built-in texts in these languages. */
export async function translateModuleFlows(projectId: string, locales: Locale[]): Promise<void> {
  await translateFlowTexts(await moduleFlowIds(projectId), locales);
}

/**
 * Email subjects and bodies, and the "error"/"message" a response step
 * sends, in each language: stored next to the original as subject_i18n,
 * body_i18n ({ es: "…" }). The flow runtime picks the variant for the
 * recipient's (or visitor's) language.
 */
async function translateFlowTexts(flowIds: string[], locales: Locale[]): Promise<void> {
  if (!flowIds.length || !locales.length) return;
  const flows = await db.flow.findMany({ where: { id: { in: flowIds } }, select: { id: true, graph: true } });
  for (const locale of locales) {
    const strings: Record<string, string> = {};
    for (const f of flows) {
      for (const n of (f.graph as Graph | null)?.nodes ?? []) {
        const d = n.data ?? {};
        if (n.type === "email") {
          for (const k of ["subject", "body"] as const) if (typeof d[k] === "string" && d[k]) strings[`${f.id}|${n.id}|${k}`] = d[k] as string;
        } else if (n.type === "response") {
          const body = parseObject(d.body);
          for (const k of RESPONSE_KEYS) if (body && typeof body[k] === "string") strings[`${f.id}|${n.id}|${k}`] = body[k] as string;
        }
      }
    }
    if (!Object.keys(strings).length) continue;
    const texts = await localizeStrings(strings, locale);
    for (const f of flows) {
      const graph = (f.graph ?? {}) as Graph;
      let changed = false;
      const nodes = (graph.nodes ?? []).map((n) => {
        const d = { ...(n.data ?? {}) };
        const take = (k: string) => {
          const v = texts[`${f.id}|${n.id}|${k}`];
          return v && v !== strings[`${f.id}|${n.id}|${k}`] ? v : null;
        };
        if (n.type === "email") {
          for (const k of ["subject", "body"] as const) {
            const v = take(k);
            if (!v) continue;
            d[`${k}_i18n`] = { ...((d[`${k}_i18n`] as Record<string, string> | undefined) ?? {}), [locale]: v };
            changed = true;
          }
        } else if (n.type === "response") {
          const body = parseObject(d.body);
          if (!body) return n;
          let any = false;
          for (const k of RESPONSE_KEYS) {
            const v = take(k);
            if (v) { body[k] = v; any = true; }
          }
          if (!any) return n;
          d.body_i18n = { ...((d.body_i18n as Record<string, string> | undefined) ?? {}), [locale]: JSON.stringify(body) };
          changed = true;
        }
        return { ...n, data: d };
      });
      if (changed) await db.flow.update({ where: { id: f.id }, data: { graph: { ...graph, nodes } as object } });
    }
  }
}

/* ── Visitors' saved language ──────────────────────────────────────────── */

/**
 * Multilingual apps remember each signed-up visitor's language: a `locale`
 * column on the sign-in feature's users table (added if missing), filled in
 * at sign-up from the language they used ({{request.lang}}). Built-in emails
 * to them use it.
 */
export async function ensureVisitorLocale(projectId: string): Promise<void> {
  const table = await db.dataTable.findFirst({
    where: { name: "auth_users", datasource: { projectId, kind: "POSTGRES_INTERNAL" } },
    select: { id: true, schema: true },
  });
  if (!table) return;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query(`ALTER TABLE "${projectSchemaName(projectId)}"."auth_users" ADD COLUMN IF NOT EXISTS "locale" TEXT`);
  } finally {
    await pool.end();
  }
  const schema = (table.schema ?? {}) as { fields?: Array<{ name: string; type: string }> };
  if (!(schema.fields ?? []).some((f) => f.name === "locale")) {
    await db.dataTable.update({ where: { id: table.id }, data: { schema: { ...schema, fields: [...(schema.fields ?? []), { name: "locale", type: "text" }] } } });
  }
  // Sign-up saves the language the visitor used.
  const flows = await db.flow.findMany({ where: { projectId, slug: { in: ["register", "auth-register"] } }, select: { id: true, graph: true } });
  for (const f of flows) {
    const graph = (f.graph ?? {}) as Graph;
    let changed = false;
    const nodes = (graph.nodes ?? []).map((n) => {
      const d = n.data ?? {};
      const values = d.values as Record<string, unknown> | undefined;
      if (n.type !== "insert" || d.table !== "auth_users" || !values || "locale" in values) return n;
      changed = true;
      return { ...n, data: { ...d, values: { ...values, locale: "{{request.lang}}" } } };
    });
    if (changed) await db.flow.update({ where: { id: f.id }, data: { graph: { ...graph, nodes } as object } });
  }
}

/* ── What the studio shows ─────────────────────────────────────────────── */

export type LanguagesView = {
  default: Locale;
  explicit: boolean;
  locales: Locale[];
  languages: Array<{ locale: Locale; ok: number; stale: number; missing: number; edited: number; job: TranslateJob | null }>;
  pages: Array<{ id: string; slug: string; title: string; states: Record<string, TranslationState> }>;
};

export async function languagesView(projectId: string): Promise<LanguagesView> {
  const app = await getAppLocale(projectId);
  const others = app.locales.slice(1);
  const pages = await db.page.findMany({
    where: { projectId },
    orderBy: [{ isHome: "desc" }, { createdAt: "asc" }],
    select: { id: true, slug: true, title: true, html: true, translations: { select: { locale: true, sourceHash: true, origin: true } } },
  });
  const rows = pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    states: Object.fromEntries(others.map((l) => [l, translationState(p, p.translations.find((t) => t.locale === l))])) as Record<string, TranslationState>,
  }));
  return {
    default: app.locale,
    explicit: app.explicit,
    locales: app.locales,
    languages: others.map((locale) => {
      const count = (s: TranslationState) => rows.filter((r) => r.states[locale] === s).length;
      return { locale, ok: count("ok"), stale: count("stale"), missing: count("missing"), edited: count("edited"), job: translateJob(projectId, locale) };
    }),
    pages: rows,
  };
}
