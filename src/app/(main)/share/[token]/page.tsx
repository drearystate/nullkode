import Link from "next/link";
import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getFormatter, getTranslations } from "next-intl/server";
import { AppWindow, Gamepad2, Link2Off, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { withNext } from "@/lib/safe-next";
import { openShareLink } from "@/lib/sharing/links";
import { sharePreview } from "@/lib/sharing/preview";
import { CopyContents } from "@/components/sharing/copy-contents";
import { MakeCopyForm } from "@/components/sharing/make-copy-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("sharing");
  return { title: t("page.eyebrow"), robots: { index: false, follow: false } };
}

/**
 * A "Share a copy" link (docs/sharing.md): sign in or sign up first, then a
 * card says what is shared and what a copy includes, and "Make my copy"
 * makes the person's own copy.
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  // New people sign up (the sign-up page links to sign in), then come back here.
  if (!user) redirect(withNext("/signup", `/share/${encodeURIComponent(token)}`));
  const [t, format] = await Promise.all([getTranslations("sharing"), getFormatter()]);
  const r = await openShareLink(token, user);

  if (!r.ok) {
    const key = r.problem === "expired" ? "expired" : r.problem === "revoked" ? "revoked" : r.problem === "workspace" ? "workspace" : "gone";
    return <main className="studio-shell min-h-screen">
      <TopBar user={user} />
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="card p-8 text-center" data-testid="share-problem" data-problem={r.problem}>
          <Link2Off size={32} className="mx-auto text-surface-400" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">{t(`page.${key}Title`)}</h1>
          <p className="mt-2 text-sm text-surface-400">{t(`page.${key}`)}</p>
          <Link href="/dashboard" className="btn-ghost mt-6 inline-flex">{t("page.backToDashboard")}</Link>
        </div>
      </div>
    </main>;
  }

  const preview = await sharePreview(r.open);
  const own = r.open.owner.id === user.id;
  const baseCss = preview.page && preview.kind === "app" ? (await readFile(path.join(process.cwd(), "public", "nk-public.css"), "utf8").catch(() => "")).replace(/\/\*[\s\S]*?\*\//g, "") : "";
  // The shared page, isolated from this one: no scripts, no network but its pictures (like the dashboard's cards).
  const frame = preview.page
    ? preview.kind === "app"
      ? `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com https://cdn.jsdelivr.net; base-uri 'none'; form-action 'none'"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"><style>${baseCss}</style><style>${preview.page.themeCss}</style><style>body{margin:0}*{box-sizing:border-box}img{max-width:100%}${preview.page.css}</style></head><body>${preview.page.html}</body></html>`
      : preview.page.html.replace(/<head([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline' https:; font-src https: data:; base-uri 'none'; form-action 'none'">`)
    : null;
  const KindIcon = preview.kind === "game" ? Gamepad2 : preview.kind === "design" ? Sparkles : AppWindow;
  const counts = preview.counts;
  const facts = [
    preview.kind === "game" && preview.engine ? (preview.engine === "three-3d" ? t("page.engine3d") : t("page.engine2d")) : null,
    counts.pages ? t("page.pages", { count: counts.pages }) : null,
    counts.flows ? t("page.flows", { count: counts.flows }) : null,
    counts.tables ? t("page.tables", { count: counts.tables }) : null,
    counts.features ? t("page.features", { count: counts.features }) : null,
    counts.languages ? t("page.languages", { count: counts.languages }) : null,
    preview.kind !== "app" && counts.files ? t("page.files", { count: counts.files }) : null,
  ].filter((x): x is string => Boolean(x));

  return <main className="studio-shell min-h-screen">
    <TopBar user={user} />
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6" data-testid="share-page" data-kind={preview.kind}>
      <p className="studio-eyebrow text-brand-300">{t("page.eyebrow")}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight" dir="auto">{t("page.title", { from: preview.from, kind: preview.kind })}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-surface-400">{t("page.intro", { from: preview.from })}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="card overflow-hidden">
          <div className="relative aspect-[16/10] bg-surface-900">
            {preview.kind === "game" && preview.shot
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/share/open/${encodeURIComponent(token)}/shot`} alt={t("page.previewTitle", { name: preview.name })} className="h-full w-full object-cover" />
              : frame
                ? <iframe title={t("page.previewTitle", { name: preview.name })} srcDoc={frame} sandbox="" loading="lazy" tabIndex={-1} referrerPolicy="no-referrer" className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white rtl:origin-top-right" />
                : <div className="flex h-full flex-col items-center justify-center gap-2 text-surface-500"><KindIcon size={40} strokeWidth={1} aria-hidden /><span className="text-sm">{t("page.noPreview")}</span></div>}
          </div>
          <div className="p-5">
            <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold"><KindIcon size={18} className="shrink-0 text-brand-300" aria-hidden /><span className="truncate" dir="auto">{preview.name}</span></h2>
            {preview.description && <p className="mt-2 line-clamp-3 text-sm text-surface-400" dir="auto">{preview.description}</p>}
            {facts.length > 0 && <p className="mt-3 text-xs text-surface-400">{format.list(facts, { type: "unit" })}</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            {own && <p className="mb-3 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-surface-300">{t("page.own")}</p>}
            <MakeCopyForm token={token} name={preview.name} kind={preview.kind} />
            <div className="mt-3 space-y-1 text-xs text-surface-400">
              {preview.includeData && <p>{t("page.withData")}</p>}
              {preview.expiresAt && <p>{t("page.endsOn", { date: format.dateTime(new Date(preview.expiresAt), { dateStyle: "medium" }) })}</p>}
              {preview.kind === "app" && <p>{t("page.aiNotice")}</p>}
            </div>
          </div>
          <div className="card p-5">
            <CopyContents kind={preview.kind} includeData={preview.includeData} titles={{ includes: t("page.includes"), never: t("page.never") }} />
          </div>
        </div>
      </div>
    </div>
  </main>;
}
