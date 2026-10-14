import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { accessError } from "@/lib/sharing/access";
import { pendingInvites } from "@/lib/sharing/collaborators";

export const dynamic = "force-dynamic";

/** The signed-in person's pending invitations to work on other people's apps, designs and games. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return accessError(401);
  return json({ invites: await pendingInvites(user) });
}
