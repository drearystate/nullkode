import { getCurrentUser } from "@/lib/auth";
import { loadRun } from "@/lib/ai/runs";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const run = await loadRun(id);
  if (!run || run.ownerId !== user.id) {
    return new Response("Not found", { status: 404 });
  }
  return Response.json({
    id: run.id,
    kind: run.kind,
    prompt: run.prompt,
    status: run.status,
    events: run.events,
    result: run.result,
    error: run.error,
    refunded: run.refunded,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    endedAt: run.endedAt,
  });
}
