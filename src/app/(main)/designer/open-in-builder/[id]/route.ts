// Designer → page builder link.
//
// An app has one editor at a time. Switching an app from the AI Designer to
// the page builder is a one-way step the user confirms inside the Designer
// ("Move to the page builder"), so this GET never converts anything by itself —
// a plain link or a prefetch must not hand an app over by accident.
//
//   - Already switched: open the app's home page in the page builder.
//   - Not switched yet: go back to the Designer with this design open, where
//     the "Switch to the page builder" button asks first.

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { designerProjectState } from "@/lib/design-studio/pages-mirror";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const design = await db.designerDesign.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    select: { id: true, projectId: true },
  });
  if (!design) {
    const t = await getTranslations({ locale: await requestLocale(), namespace: "designer" });
    return new NextResponse(t("server.notFound"), {
      status: 404,
      headers: { "content-type": "text/plain" },
    });
  }

  const state = await designerProjectState(design.projectId);
  if (!state.moved || !design.projectId) {
    redirect(`/designer/${encodeURIComponent(design.id)}`);
  }

  const homePage = await db.page.findFirst({
    where: { projectId: design.projectId, isHome: true },
    select: { id: true },
  });
  if (!homePage) redirect(`/projects/${design.projectId}/pages`);
  redirect(`/projects/${design.projectId}/pages/${homePage.id}/edit`);
}
