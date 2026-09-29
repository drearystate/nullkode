import { z } from "zod";
import { ownedProject } from "@/lib/guard";
import { emailEnabled, isEmailAddress } from "@/lib/mailer";
import { alertSettingKey } from "@/lib/owner-alerts";
import { getSetting, setSetting } from "@/lib/settings";
import { json } from "@/lib/utils";
import { alertSettings, alertTables, MAX_EXTRA, testSettingKey } from "./_lib";

export const dynamic = "force-dynamic";

async function view(projectId: string, user: { email: string; role: string }) {
  const settings = await alertSettings(projectId);
  const [tables, test] = await Promise.all([alertTables(projectId, settings), getSetting<{ at?: string }>(testSettingKey(projectId))]);
  return {
    emailOn: emailEnabled(),
    canSetUpEmail: user.role === "ADMIN",
    ownerEmail: user.email,
    tables: tables.map(({ columns: _columns, ...t }) => t),
    extraRecipients: settings.extraRecipients.slice(0, MAX_EXTRA),
    maxExtra: MAX_EXTRA,
    testSentAt: typeof test?.at === "string" ? test.at : null,
  };
}

/** Which tables email the owner when someone sends something, and who else gets the emails. Owner only. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json(await view(id, r.user));
}

const Body = z.object({
  tables: z.record(z.string().max(100), z.enum(["instant", "off"])).optional(),
  extraRecipients: z.array(z.string().max(254)).max(20).optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Please check the alert settings and try again." }, { status: 400 });

  const current = await alertSettings(id);
  const known = new Set((await alertTables(id, current)).map((t) => t.name));
  const tables = { ...Object.fromEntries(Object.entries(current.tables).filter(([name]) => known.has(name))) };
  for (const [name, mode] of Object.entries(parsed.data.tables ?? {})) {
    if (!known.has(name)) return json({ error: "One of those tables isn't in this app any more. Reload the page and try again." }, { status: 400 });
    tables[name] = mode;
  }

  let extraRecipients = current.extraRecipients.slice(0, MAX_EXTRA);
  if (parsed.data.extraRecipients) {
    const cleaned: string[] = [];
    for (const raw of parsed.data.extraRecipients) {
      const address = raw.trim();
      if (!address) continue;
      if (!isEmailAddress(address)) return json({ error: `"${address.slice(0, 80)}" doesn't look like an email address.` }, { status: 400 });
      if (address.toLowerCase() === r.user.email.toLowerCase()) continue;
      if (!cleaned.some((x) => x.toLowerCase() === address.toLowerCase())) cleaned.push(address);
    }
    if (cleaned.length > MAX_EXTRA) return json({ error: `You can add up to ${MAX_EXTRA} more addresses.` }, { status: 400 });
    extraRecipients = cleaned;
  }

  await setSetting(alertSettingKey(id), { tables, extraRecipients });
  return json({ ok: true, ...(await view(id, r.user)) });
}
