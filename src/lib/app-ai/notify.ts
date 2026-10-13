import { db } from "../db";
import { getSetting, setSetting } from "../settings";
import { emailEnabled, sendEmailDetailed } from "../mailer";
import { aiKeyNeededEmail } from "../emails/studio";
import { localeForUser } from "@/i18n/server-locale";
import { hasConnection, isPlatformOwner } from "./connections";

/**
 * Tells an app's owner, by email and only once per app, that the app's AI
 * steps need the app's own key (docs/ai-in-apps.md). Sent the first time a
 * visitor hits an AI step without a key ("visitor"), or by the one-off
 * scripts/notify-ai-keys.ts for apps that used the platform's AI before
 * ("change"). The Setting row makes it once, across restarts and both paths.
 * Never for the platform owner, never when the app has a key.
 */
const sentKey = (projectId: string) => `appai.notified:${projectId}`;
const inFlight = new Set<string>();

export type NotifyResult = { sent: boolean; skipped?: "already" | "platform-owner" | "has-key" | "email-off" | "no-owner" | "failed" };

export async function notifyAiKeyNeeded(projectId: string, reason: "visitor" | "change", opts: { dryRun?: boolean } = {}): Promise<NotifyResult> {
  if (inFlight.has(projectId)) return { sent: false, skipped: "already" };
  inFlight.add(projectId);
  try {
    if (await getSetting(sentKey(projectId))) return { sent: false, skipped: "already" };
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, owner: { select: { id: true, email: true, name: true, role: true, resellerId: true, prefs: true } } },
    });
    if (!project?.owner?.email) return { sent: false, skipped: "no-owner" };
    if (await isPlatformOwner(project.owner)) return { sent: false, skipped: "platform-owner" };
    if (await hasConnection(projectId)) return { sent: false, skipped: "has-key" };
    if (!emailEnabled()) return { sent: false, skipped: "email-off" };
    if (opts.dryRun) return { sent: false };
    const [{ getBrand }, { resellerForUser, resellerBrandConfig, publicBaseUrlFor }] = await Promise.all([import("../brand"), import("../reseller")]);
    const platform = await getBrand();
    const reseller = await resellerForUser(project.owner);
    const brand = reseller ? resellerBrandConfig(reseller, platform) : platform;
    const base = await publicBaseUrlFor(project.owner);
    const mail = aiKeyNeededEmail(await localeForUser(project.owner), {
      name: project.owner.name,
      app: (project.name || "your app").replace(/\s+/g, " ").slice(0, 80),
      platform: brand.appName,
      link: `${base}/projects/${projectId}/ai`,
      reason,
    });
    const r = await sendEmailDetailed({ to: project.owner.email, subject: mail.subject, text: mail.text, html: mail.html, fromName: brand.appName || undefined });
    if (!r.ok) {
      console.error(`[app-ai] key email for ${projectId} not sent: ${r.error ?? "unknown error"}`);
      return { sent: false, skipped: r.skipped ? "email-off" : "failed" };
    }
    await setSetting(sentKey(projectId), { at: new Date().toISOString(), reason });
    return { sent: true };
  } catch (err) {
    console.error("[app-ai] key email failed:", err instanceof Error ? err.message : err);
    return { sent: false, skipped: "failed" };
  } finally {
    inFlight.delete(projectId);
  }
}
