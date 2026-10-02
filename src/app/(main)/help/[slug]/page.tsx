import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getCurrentUser, getRealUser } from "@/lib/auth";
import { getRequestBrand } from "@/lib/reseller";
import { withNext } from "@/lib/safe-next";
import { TopBar } from "@/components/top-bar";
import { RichText } from "@/components/help/rich-text";
import { audienceAllows, brandGuide, sectionAnchor, type Guide } from "@/lib/help/guides";
import { getLocalizedGroups, getLocalizedGuide } from "@/lib/help/localized";
import { getLocale, getTranslations } from "next-intl/server";
import { lightScreenshot, screenshotSize } from "@/lib/help/screenshot-files";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** The guide, if it exists and the signed-in person may read it. */
async function readableGuide(slug: string) {
  const locale = await getLocale();
  const guide = getLocalizedGuide(slug, locale);
  if (!guide) return null;
  const [user, real] = await Promise.all([getCurrentUser(), getRealUser()]);
  if (!user) return { guide, user: null, appName: "", locale };
  const role = real?.role ?? user.role;
  if (!audienceAllows(guide.audience, role)) return null;
  const { brand } = await getRequestBrand(user);
  return { guide: brandGuide(guide, brand.appName), user, appName: brand.appName, role, locale };
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const found = await readableGuide(slug).catch(() => null);
  const t = await getTranslations("helpui");
  return { title: found?.user ? t("guideMetaTitle", { title: found.guide.title }) : t("help") };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const found = await readableGuide(slug);
  if (!found) notFound();
  if (!found.user) redirect(withNext("/login", `/help/${slug}`));
  const { guide, user, appName, role, locale } = found;
  const t = await getTranslations("helpui");

  const sections = await Promise.all(
    guide.sections.map(async (s) => ({
      ...s,
      id: sectionAnchor(s),
      image: s.screenshot ? await screenshotSize(s.screenshot.file) : null,
      // Shown instead in light mode, when it has been captured.
      lightImage: s.screenshot ? Boolean(await screenshotSize(lightScreenshot(s.screenshot.file))) : false,
    })),
  );
  const related = guide.related
    .map((r) => getLocalizedGuide(r, locale))
    .filter((g): g is Guide => Boolean(g) && audienceAllows(g!.audience, role))
    .map((g) => brandGuide(g, appName));
  const groupTitle = getLocalizedGroups(locale).find((g) => g.id === guide.group)?.title ?? t("help");
  const showToc = sections.length >= 4;

  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user}>
        <Link href="/help" className="studio-workspace-label hover:text-white">
          {t("helpGuides")}
        </Link>
      </TopBar>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <Link href="/help" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-white">
          <ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden />
          {t("backToAll")}
        </Link>

        <div className={`mt-6 ${showToc ? "lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-12" : ""}`}>
          <article aria-labelledby="guide-title" className="min-w-0 max-w-[70ch]">
            <header>
              <p className="studio-eyebrow text-brand-300">{groupTitle.toLocaleUpperCase(locale)}</p>
              <h1 id="guide-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {guide.title}
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-surface-300">{guide.summary}</p>
            </header>

            {showToc && (
              <nav aria-label={t("onThisPage")} className="mt-8 rounded-2xl border border-[var(--nk-line)] bg-surface-900 p-5 lg:hidden">
                <TocList sections={sections} label={t("onThisPageEyebrow")} />
              </nav>
            )}

            <div className="mt-10 space-y-12">
              {sections.map((s) => (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-24">
                  <h2 id={`${s.id}-heading`} className="text-xl font-semibold tracking-tight text-surface-50">
                    {s.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-[15px] leading-7 text-surface-300 [overflow-wrap:anywhere]">
                    {s.body.map((p, i) => (
                      <p key={i}>
                        <RichText text={p} />
                      </p>
                    ))}
                  </div>
                  {s.steps && s.steps.length > 0 && (
                    <ol className="mt-4 space-y-3">
                      {s.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-[15px] leading-7 text-surface-300 [overflow-wrap:anywhere]">
                          <span
                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-200"
                            aria-hidden
                          >
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="sr-only">{t("step", { n: i + 1 })}</span>
                            <RichText text={step} />
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2.5">
                      {s.bullets.map((b, i) => (
                        <li key={i} className="flex gap-3 text-[15px] leading-7 text-surface-300 [overflow-wrap:anywhere]">
                          <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300/70" aria-hidden />
                          <span className="min-w-0">
                            <RichText text={b} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.screenshot && s.image && (
                    <figure className="mt-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/help/${s.screenshot.file}`}
                        alt={s.screenshot.alt}
                        width={s.image.width || undefined}
                        height={s.image.height || undefined}
                        loading="lazy"
                        decoding="async"
                        className={`h-auto w-full rounded-xl border border-white/10 bg-[var(--nk-chrome)] shadow-2xl shadow-black/30 ${s.lightImage ? "help-shot-dark" : ""}`}
                      />
                      {s.lightImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/help/${lightScreenshot(s.screenshot.file)}`}
                          alt={s.screenshot.alt}
                          width={s.image.width || undefined}
                          height={s.image.height || undefined}
                          loading="lazy"
                          decoding="async"
                          className="help-shot-light h-auto w-full rounded-xl border border-white/10 bg-[var(--nk-chrome)] shadow-xl shadow-black/10"
                        />
                      )}
                      <figcaption className="mt-2.5 text-sm text-surface-400">{s.screenshot.caption}</figcaption>
                    </figure>
                  )}
                </section>
              ))}
            </div>

            {related.length > 0 && (
              <section aria-labelledby="related-heading" className="mt-16 border-t border-white/[0.07] pt-10">
                <h2 id="related-heading" className="text-lg font-semibold tracking-tight">
                  {t("related")}
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/help/${r.slug}`}
                        className="group flex h-full flex-col rounded-2xl border border-[var(--nk-line)] bg-surface-900 p-5 transition hover:border-brand-400/50"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-surface-50">{r.title}</span>
                          <ArrowRight size={15} className="mt-1 shrink-0 text-surface-500 group-hover:text-brand-300 rtl:-scale-x-100" aria-hidden />
                        </span>
                        <span className="mt-2 text-sm leading-relaxed text-surface-400">{r.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="mt-12">
              <Link href="/help" className="btn-ghost">
                <ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden />
                {t("backToAll")}
              </Link>
            </p>
          </article>

          {showToc && (
            <aside className="hidden lg:block">
              <nav aria-label={t("onThisPage")} className="sticky top-24 rounded-2xl border border-[var(--nk-line)] bg-surface-900 p-5">
                <TocList sections={sections} label={t("onThisPageEyebrow")} />
              </nav>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}

function TocList({ sections, label }: { sections: Array<{ id: string; heading: string }>; label: string }) {
  return (
    <>
      <p className="studio-eyebrow">{label}</p>
      <ol className="mt-3 space-y-2 text-sm">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-surface-300 hover:text-white">
              {s.heading}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
