import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { accessError } from "@/lib/sharing/access";
import { pendingInvites, sharedWithMe } from "@/lib/sharing/collaborators";

export const dynamic = "force-dynamic";

/** "Shared with me": apps, designs and games other people invited the person to, and pending invitations. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return accessError(401);
  const [items, invites] = await Promise.all([sharedWithMe(user), pendingInvites(user)]);
  return json({ items, invites });
}
