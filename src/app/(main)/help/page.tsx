import { redirect } from "next/navigation";
import { getCurrentUser, getRealUser } from "@/lib/auth";
import { getRequestBrand } from "@/lib/reseller";
import { withNext } from "@/lib/safe-next";
import { TopBar } from "@/components/top-bar";
import { HelpIndex, type HelpIndexGroup } from "@/components/help/help-index";
import { audienceAllows, brandGuide, guideText } from "@/lib/help/guides";
import { getLocalizedGroups, getLocalizedGuides } from "@/lib/help/localized";
import { getLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("helpui");
  return { title: t("metaTitle") };
}

export default async function HelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect(withNext("/login", "/help"));
  // What the person may read depends on who they really are, not on the
  // workspace an admin or reseller is viewing.
  const [real, { brand }] = await Promise.all([getRealUser(), getRequestBrand(user)]);
  const role = real?.role ?? user.role;
  const locale = await getLocale();
  const t = await getTranslations("helpui");

  const visible = getLocalizedGuides(locale)
    .filter((g) => audienceAllows(g.audience, role))
    .map((g) => brandGuide(g, brand.appName));
  const groups: HelpIndexGroup[] = getLocalizedGroups(locale).map((group) => ({
    id: group.id,
    title: group.title,
    guides: visible
      .filter((g) => g.group === group.id)
      .map((g) => ({ slug: g.slug, title: g.title, summary: g.summary, text: guideText(g).toLowerCase() })),
  })).filter((g) => g.guides.length > 0);

  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user}>
        <span className="studio-workspace-label">{t("helpGuides")}</span>
      </TopBar>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <header>
          <p className="studio-eyebrow text-brand-300">{t("eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("heading")}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-surface-400">
            {t.rich("intro", { app: brand.appName, b: (c) => <strong className="font-semibold text-surface-200">{c}</strong> })}
          </p>
        </header>
        <HelpIndex groups={groups} />
      </div>
    </main>
  );
}
