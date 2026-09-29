import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { errorResponse, latestSubmissions } from "../_lib/tables";

/** The newest things visitors sent in, across the app's form tables. Owner only. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  try {
    return json({ submissions: await latestSubmissions(id, 5) });
  } catch (err) {
    return errorResponse(err);
  }
}
