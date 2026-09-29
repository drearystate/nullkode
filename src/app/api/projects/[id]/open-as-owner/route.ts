import { ownedProject } from "@/lib/guard";
import { appPublicUrl } from "@/lib/reseller";
import { mintOwnerTicket } from "@/lib/owner-login";

/**
 * Opens the owner's published app signed in as its owner (see
 * lib/owner-login.ts), on the page given by ?page=<slug>. Apps that aren't
 * published open in the builder's preview instead.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const page = (new URL(req.url).searchParams.get("page") ?? "").replace(/[^a-z0-9-]/gi, "");
  if (!r.project.published) {
    return Response.redirect(new URL(`/preview/${id}${page ? `?page=${page}` : ""}`, req.url), 303);
  }
  const app = new URL(await appPublicUrl(r.project));
  const base = app.pathname.replace(/\/$/, "");
  const target = new URL("/api/app-owner-login", app.origin);
  target.searchParams.set("ticket", await mintOwnerTicket(id, r.user.id));
  target.searchParams.set("to", `${base}/${page}`);
  return new Response(null, { status: 303, headers: { location: target.toString(), "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
