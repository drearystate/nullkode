import { z } from "zod";
import type { User } from "@prisma/client";
import { getRealUser } from "@/lib/auth";
import { ownedProject } from "@/lib/guard";
import { eraseUser, exportUserData, findUserRows, normalizeEmail, PersonError, phoneDigits } from "@/lib/app-account-data";
import { recordPrivacyRequest, setPrivacyRequestDone } from "@/lib/privacy-store";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { errorText, errorsT } from "@/lib/errors-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["search", "export", "erase"]),
  /** An email address or a phone number. */
  query: z.string().trim().min(1).max(320),
  /** The logged request this answers; without one, a new entry is logged as done. */
  requestId: z.string().max(40).nullish(),
  /** Erase: tables where rows are kept with the personal details blanked, instead of deleted. */
  keep: z.array(z.string().max(100)).max(500).optional(),
  /** Erase: the owner confirmed after seeing what will go. */
  confirm: z.boolean().optional(),
});

function person(query: string): { email?: string; phone?: string } | null {
  if (query.includes("@")) {
    const email = normalizeEmail(query);
    return email ? { email } : null;
  }
  return phoneDigits(query) ? { phone: query } : null;
}

/** Who handled it, for the request log: the real person signed in (an admin helping counts as the admin). */
async function handler(fallback: User): Promise<string> {
  const real = (await getRealUser()) ?? fallback;
  return real.name?.trim() || real.email;
}

async function logDone(projectId: string, type: "access" | "erasure", requestId: string | null | undefined, by: string) {
  if (requestId && (await setPrivacyRequestDone(projectId, requestId, true, by))) return;
  await recordPrivacyRequest(projectId, { type, source: "owner", completed: true, handledBy: by });
}

/**
 * The privacy desk in the Data tab (owner only; anyone else gets 404):
 * find everything the app keeps about one person by email or phone, download
 * it as a .zip, or erase it. Erase deletes their rows (or, for tables the
 * owner marks "keep", blanks the personal details) and logs the request done.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const locale = await requestLocale();
  const t = await getTranslations({ locale, namespace: "data.api" });
  const te = errorsT(locale);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("enterContact") }, { status: 400 });
  const who = person(parsed.data.query);
  if (!who) return json({ error: t("enterFullContact") }, { status: 400 });

  try {
    if (parsed.data.action === "search") {
      return json({ findings: await findUserRows(id, who, { mode: "owner", mentions: true, t: te }) });
    }
    if (parsed.data.action === "export") {
      const { zip } = await exportUserData(id, who, { mode: "owner", appName: r.project.name, t: te });
      await logDone(id, "access", parsed.data.requestId, await handler(r.user));
      const tag = (who.email ?? who.phone ?? "person").replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
      return new Response(zip as unknown as BodyInit, {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="data-${tag}-${new Date().toISOString().slice(0, 10)}.zip"`,
          "cache-control": "no-store",
        },
      });
    }
    if (!parsed.data.confirm) return json({ error: t("confirmErase") }, { status: 400 });
    const result = await eraseUser(id, who, { mode: "owner", keep: parsed.data.keep ?? [], t: te });
    await logDone(id, "erasure", parsed.data.requestId, await handler(r.user));
    return json({ result });
  } catch (err) {
    if (err instanceof PersonError) return json({ error: errorText(err, te) }, { status: err.status });
    console.error("[privacy] desk action failed", err);
    return json({ error: t("privacyFailed") }, { status: 500 });
  }
}
