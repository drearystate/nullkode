import { getCurrentUser } from "@/lib/auth";
import { listTemplateSummaries } from "@/lib/templates/registry";
import { json } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json({ templates: listTemplateSummaries() });
}
