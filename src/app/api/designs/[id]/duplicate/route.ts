import { duplicateDesign } from "@/lib/design-studio/store";
import { withUser } from "@/lib/design-studio/http";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => ({ design: await duplicateDesign(user.id, id) }));
}
