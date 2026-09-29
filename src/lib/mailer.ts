import { Resend } from "resend";

/**
 * Platform email (invitations, password resets). Optional: without an email
 * key every link is shown on screen for the admin or reseller to share, so a
 * fresh install works before email is configured.
 */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: { to: string; subject: string; text: string; fromName?: string; replyTo?: string | null }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const address = process.env.DEFAULT_EMAIL_FROM || "no-reply@example.com";
  // DEFAULT_EMAIL_FROM may be "Name <addr>"; keep the address, use the caller's display name.
  const bare = address.match(/<([^>]+)>/)?.[1] ?? address;
  try {
    const { error } = await new Resend(key).emails.send({
      from: opts.fromName ? `${opts.fromName.replace(/[<>"]/g, "")} <${bare}>` : address,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    if (error) console.error("[mailer] send failed", error.message);
    return !error;
  } catch (err) {
    console.error("[mailer] send failed", err instanceof Error ? err.message : err);
    return false;
  }
}
