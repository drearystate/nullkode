import { stopImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";

export async function POST() {
  await stopImpersonation();
  return json({ ok: true });
}
