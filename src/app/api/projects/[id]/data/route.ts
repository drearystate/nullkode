import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { errorResponse, listTables } from "./_lib/tables";

/** The app's tables, with friendly names and how many rows each has. Owner only. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  try {
    return json({ tables: await listTables(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
