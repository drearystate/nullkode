import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { stripe, billingScopeFor } from "@/lib/stripe";
import { publicBaseUrlFor } from "@/lib/reseller";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!user.stripeCustomerId) return json({ error: "No customer" }, { status: 400 });

  const session = await (await stripe(billingScopeFor(user))).billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${await publicBaseUrlFor(user)}/billing`,
  });
  return json({ url: session.url });
}
