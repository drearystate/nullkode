import { getCurrentUser } from "@/lib/auth";
import { requestErrorsT } from "@/lib/errors-i18n";
import { json } from "@/lib/utils";
import { stripe, billingScopeFor } from "@/lib/stripe";
import { publicBaseUrlFor } from "@/lib/reseller";

export async function POST() {
  const user = await getCurrentUser();
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.unauthorized") }, { status: 401 });
  if (!user.stripeCustomerId) return json({ error: t("billing.noCustomer") }, { status: 400 });

  const session = await (await stripe(billingScopeFor(user))).billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${await publicBaseUrlFor(user)}/billing`,
  });
  return json({ url: session.url });
}
