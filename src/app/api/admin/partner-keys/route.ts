import { json } from "@/lib/utils";
import { createKeyFor, listKeys, partnerActor } from "@/lib/partner/manage";

export const dynamic = "force-dynamic";

/** Partner API keys (every scope; the operator only). */
export async function GET() {
  const a = await partnerActor("admin");
  if ("error" in a) return a.error;
  return json({ keys: await listKeys(a.actor) });
}

/** Creates a key; its secret is in the answer once and never again. */
export async function POST(req: Request) {
  const a = await partnerActor("admin");
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  return createKeyFor(a.actor, body && typeof body === "object" ? body : {});
}
