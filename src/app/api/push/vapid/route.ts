import { json } from "@/lib/utils";
import { getVapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Public key browsers need to subscribe to this server's push messages. */
export async function GET() {
  const { publicKey } = await getVapidKeys();
  return json({ publicKey });
}
