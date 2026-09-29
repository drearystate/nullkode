import { redirect } from "next/navigation";
import { getCurrentUser, getRealUser } from "@/lib/auth";
import { getRequestBrand } from "@/lib/reseller";
import { withNext } from "@/lib/safe-next";
import { TopBar } from "@/components/top-bar";
import { HelpIndex, type HelpIndexGroup } from "@/components/help/help-index";
import { GROUPS, allGuides, audienceAllows, brandGuide, guideText } from "@/lib/help/guides";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help & guides" };

export default async function HelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect(withNext("/login", "/help"));
  // What the person may read depends on who they really are, not on the
  // workspace an admin or reseller is viewing.
  const [real, { brand }] = await Promise.all([getRealUser(), getRequestBrand(user)]);
  const role = real?.role ?? user.role;

  const visible = allGuides()
    .filter((g) => audienceAllows(g.audience, role))
    .map((g) => brandGuide(g, brand.appName));
  const groups: HelpIndexGroup[] = GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    guides: visible
      .filter((g) => g.group === group.id)
      .map((g) => ({ slug: g.slug, title: g.title, summary: g.summary, text: guideText(g).toLowerCase() })),
  })).filter((g) => g.guides.length > 0);

  return (
    <main className="studio-shell min-h-screen">
      <TopBar user={user}>
        <span className="studio-workspace-label">Help &amp; guides</span>
      </TopBar>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <header>
          <p className="studio-eyebrow text-brand-300">HELP &amp; GUIDES</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How can we help?</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-surface-400">
            Step-by-step guides to everything in {brand.appName}. The <strong className="font-semibold text-surface-200">Help</strong> link at the
            top of any screen opens the guide for that screen.
          </p>
        </header>
        <HelpIndex groups={groups} />
      </div>
    </main>
  );
}
