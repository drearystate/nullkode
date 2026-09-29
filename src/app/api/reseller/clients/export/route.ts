import { requireReseller } from "@/lib/reseller-admin";
import { clientsCsv, loadClientRows } from "@/lib/reseller-clients";

export const dynamic = "force-dynamic";

/**
 * The reseller's client list as a CSV file that opens in Excel, Numbers or
 * Google Sheets: status, plan, payment, apps, AI use, last active and what
 * needs attention (the same numbers as /reseller/clients).
 */
export async function GET() {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const rows = await loadClientRows(r.reseller);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(clientsCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="clients-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
