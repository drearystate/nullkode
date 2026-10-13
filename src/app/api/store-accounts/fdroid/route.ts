import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { createRepo, getRepo, updateRepo } from "@/lib/store-publish/fdroid";
import { errorResponse, repoView, signedIn, tr } from "@/lib/store-publish/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Makes the person's own F-Droid repository. Body: { name?, description? }. */
export async function POST(req: Request) {
  const res = await signedIn({ write: true });
  if ("response" in res) return res.response;
  if (!hitLimit(`fdroid-repo:${res.user.id}`, 10, 10 * 60_000).ok) return json({ error: (await tr())("tooManyTries") }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { name?: unknown; description?: unknown } | null;
  try {
    const repo = await createRepo(res.user, {
      name: typeof body?.name === "string" ? body.name : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
    });
    return json({ repo: await repoView(repo) });
  } catch (err) {
    return errorResponse(err, "store-accounts/fdroid");
  }
}

/** Renames the repository or changes its description. */
export async function PATCH(req: Request) {
  const res = await signedIn({ write: true });
  if ("response" in res) return res.response;
  const repo = await getRepo(res.user.id);
  if (!repo) return json({ error: (await tr())("errors.noRepo") }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { name?: unknown; description?: unknown } | null;
  try {
    const next = await updateRepo(repo, {
      name: typeof body?.name === "string" ? body.name : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
    });
    return json({ repo: await repoView(next) });
  } catch (err) {
    return errorResponse(err, "store-accounts/fdroid");
  }
}
