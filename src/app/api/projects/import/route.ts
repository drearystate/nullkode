import { getCurrentUser } from "@/lib/auth";
import { checkProjectLimit } from "@/lib/guard";
import { hitLimit } from "@/lib/rate-limit";
import { importApp, ImportError } from "@/lib/app-import";
import { json } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 100 * 1024 * 1024;

/** Creates a new app from a backup .zip made by Export (see lib/app-import.ts). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in again." }, { status: 401 });
  const limit = await checkProjectLimit(user);
  if (limit) return limit;
  if (!hitLimit(`import:${user.id}`, 10, 60 * 60 * 1000).ok) return json({ error: "You've imported a lot of apps in the last hour. Try again later." }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Choose a backup .zip to import." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "Choose a backup .zip to import." }, { status: 400 });
  if (file.size > MAX_BYTES) return json({ error: "That backup is larger than 100 MB." }, { status: 413 });
  const name = typeof form.get("name") === "string" ? String(form.get("name")) : undefined;

  try {
    const result = await importApp(user.id, Buffer.from(await file.arrayBuffer()), name);
    return json(result);
  } catch (err) {
    if (err instanceof ImportError) return json({ error: err.message }, { status: 400 });
    console.error("[import] failed", err);
    return json({ error: "Couldn't import that backup. Please try again." }, { status: 500 });
  }
}
