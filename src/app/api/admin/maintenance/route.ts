import { z } from "zod";
import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { lastMaintenance, maintenanceHour, maintenanceMode, RETENTION, runMaintenance, setMaintenanceMode } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

/**
 * Nightly clean-up settings (Admin > System), operators only.
 *   GET                                  → mode, hour, last run, what is kept
 *   PUT  { mode: "report"|"apply"|"off" } → choose whether it removes anything
 *   POST                                 → run it now in the chosen mode
 *                                          ("off" runs a report)
 */

async function admin() {
  const user = await getRealUser();
  return user && user.role === "ADMIN" ? user : null;
}

const notFound = () => json({ error: "Not found" }, { status: 404 });

async function state() {
  const [{ mode, source }, last] = await Promise.all([maintenanceMode(), lastMaintenance()]);
  return { mode, source, hour: maintenanceHour(), retention: RETENTION, last };
}

export async function GET() {
  if (!(await admin())) return notFound();
  return json(await state());
}

const Put = z.object({ mode: z.enum(["report", "apply", "off"]) });

export async function PUT(req: Request) {
  if (!(await admin())) return notFound();
  const parsed = Put.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Choose report only, on, or off." }, { status: 400 });
  await setMaintenanceMode(parsed.data.mode);
  return json(await state());
}

export async function POST() {
  if (!(await admin())) return notFound();
  const { mode } = await maintenanceMode();
  const run = runMaintenance({ apply: mode === "apply" }).catch((err) => ({ skipped: `failed: ${err instanceof Error ? err.message : String(err)}` }));
  // Small installs finish in seconds; a big first clean-up carries on in the background.
  const result = await Promise.race([run, new Promise<null>((r) => setTimeout(() => r(null), 25_000))]);
  if (!result) return json({ started: true, ...(await state()) }, { status: 202 });
  if ("skipped" in result) return json({ error: `Not run: ${result.skipped}.`, ...(await state()) }, { status: 409 });
  return json({ ok: true, ...(await state()) });
}
