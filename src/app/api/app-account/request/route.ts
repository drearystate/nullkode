import { after } from "next/server";
import { z } from "zod";
import type { Project } from "@prisma/client";
import { deleteAccountUrl, hasDataFor, normalizeEmail } from "@/lib/app-account-data";
import { appProjectFromRequest, jsonResponse, visitorIp } from "@/lib/app-account-http";
import { DELETION_LINK_HOURS, signDeletionToken } from "@/lib/app-account-token";
import { emailEnabled, sendEmail } from "@/lib/mailer";
import { queueDeletionRequest } from "@/lib/privacy-store";
import { hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().max(320) });

/**
 * The signed-out "delete my account" form on an app's /delete-account page
 * (for people who can't sign in any more). The answer is always the same,
 * whether or not the email has an account, and the lookup happens after the
 * answer is sent, so the form can't be used to find out who uses the app.
 *
 * With email set up on this server, the person gets a link (24 hours) to
 * confirm. Without it, the request waits in the owner's Data tab under
 * Privacy requests for them to approve.
 */
export async function POST(req: Request) {
  const project = await appProjectFromRequest(req);
  if (!project) return jsonResponse({ error: "We couldn't find this app." }, 404);
  const limit = hitLimit(`app-delete-request:${visitorIp(req)}`, 5, 15 * 60_000);
  if (!limit.ok) return jsonResponse({ error: "Too many requests. Please wait a few minutes and try again." }, 429, { "retry-after": String(limit.retryAfterSec) });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const email = normalizeEmail(parsed.success ? parsed.data.email : null);
  if (!email) return jsonResponse({ error: "Enter the email address you signed up with." }, 400);

  const emailOn = emailEnabled();
  // Quietly ignore repeats for the same address (the answer doesn't change).
  if (hitLimit(`app-delete-request:${project.id}:${email}`, 3, 24 * 60 * 60_000).ok) {
    after(() =>
      handleRequest(project, email, emailOn).catch((err) =>
        console.error("[app-account] deletion request failed", err instanceof Error ? err.message : err),
      ),
    );
  }
  return jsonResponse({
    ok: true,
    message: emailOn
      ? `Thanks. If an account uses that email address, we've sent it a link to confirm. The link works for ${DELETION_LINK_HOURS} hours.`
      : "Thanks. If an account uses that email address, the app's team will delete it and its data within 30 days.",
  });
}

async function handleRequest(project: Project, email: string, emailOn: boolean): Promise<void> {
  if (!(await hasDataFor(project.id, email))) return;
  if (emailOn) {
    const token = await signDeletionToken(project.id, email);
    const link = `${await deleteAccountUrl(project)}?token=${encodeURIComponent(token)}`;
    const sent = await sendEmail({
      to: email,
      fromName: project.name,
      subject: `Delete your ${project.name} account`,
      text:
        `Hi,\n\nSomeone, hopefully you, asked to delete the account for this email address in ${project.name}, together with its data.\n\n` +
        `To confirm, open this link. It works for ${DELETION_LINK_HOURS} hours:\n${link}\n\n` +
        `If you didn't ask for this, you can ignore this email. Nothing will change.\n`,
    });
    if (sent) return;
    // Sending failed: leave it for the owner rather than dropping it.
  }
  await queueDeletionRequest(project.id, email);
}
