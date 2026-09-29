import { ownedProject } from "@/lib/guard";
import { errorResponse, parseRowQuery, readRows, toCsv } from "../../../_lib/tables";

/** Download the table (same search and sort as the grid) as a CSV file, up to 50,000 rows. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; table: string }> }) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  try {
    const result = await readRows(id, table, parseRowQuery(new URL(req.url), { csv: true }));
    const file = `${result.table.name.replace(/[^a-zA-Z0-9_-]/g, "") || "data"}.csv`;
    return new Response(toCsv(result), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${file}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
