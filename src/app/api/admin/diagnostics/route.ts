import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { collectDiagnostics, diagnosticsText } from "@/lib/system-health";

export const dynamic = "force-dynamic";

/**
 * Admin > System's diagnostics bundle: version, architecture, install type,
 * Node and PostgreSQL versions, HTTPS mode, whether APPS_DOMAIN is set, the
 * names (never values) of the settings in .env, every health check and the
 * last 50 warnings and errors, redacted. ?format=txt downloads it as text.
 * Operators only; everyone else gets 404.
 */
export async function GET(req: Request) {
  const user = await getRealUser();
  if (!user || user.role !== "ADMIN") return json({ error: "Not found" }, { status: 404 });
  const d = await collectDiagnostics();
  if (new URL(req.url).searchParams.get("format") === "txt") {
    return new Response(diagnosticsText(d), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="system-details-${d.generatedAt.slice(0, 10)}.txt"`,
        "cache-control": "no-store",
      },
    });
  }
  return json(d, { headers: { "cache-control": "no-store" } });
}
