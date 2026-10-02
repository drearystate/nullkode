/**
 * The platform's emails to studio users (invitations, password links, AI
 * usage warnings, app alerts, the admin's test email), written in the
 * recipient's language (see localeForUser) with messages/<locale>/emails.json.
 *
 * Each email is a list of blocks: a paragraph, a link on its own, or a
 * sentence with the link on the next line. The plain-text part is exactly
 * what these emails always were; the HTML part carries lang/dir so Arabic,
 * Urdu and Persian read right to left.
 */
import { translatorFor, type EmailT } from "@/i18n/server-locale";
import type { Locale } from "@/i18n/locales";

export type EmailBlock = string | { text?: string; link: string };
export type RenderedEmail = { subject: string; text: string; html: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const linkHtml = (url: string) => `<a href="${esc(url)}" dir="ltr" style="color:#4f46e5;word-break:break-all">${esc(url)}</a>`;

/** Plain text and HTML for one email. */
export function renderEmail(locale: Locale, dir: "ltr" | "rtl", subject: string, blocks: EmailBlock[], trailingNewline = true): RenderedEmail {
  const parts = blocks.map((b) => (typeof b === "string" ? b : b.text ? `${b.text}\n${b.link}` : b.link));
  const text = parts.join("\n\n") + (trailingNewline ? "\n" : "");
  const align = dir === "rtl" ? "right" : "left";
  const body = blocks
    .map((b) => {
      if (typeof b === "string") return `<p style="margin:0 0 16px">${esc(b).replace(/\n/g, "<br>")}</p>`;
      return `<p style="margin:0 0 16px">${b.text ? `${esc(b.text).replace(/\n/g, "<br>")}<br>` : ""}${linkHtml(b.link)}</p>`;
    })
    .join("\n");
  const html =
    `<!doctype html>\n<html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>` +
    `<body style="margin:0;padding:24px;background:#ffffff;color:#111827;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans','Noto Sans Arabic',Tahoma,Arial,sans-serif">` +
    `<div dir="${dir}" style="max-width:560px;text-align:${align}">\n${body}\n</div></body></html>`;
  return { subject, text, html };
}

function hi(t: EmailT, name: string | null | undefined) {
  return name ? t("hiName", { name }) : t("hi");
}

/** Invitation to set a password on an account someone created for them. */
export function inviteEmail(locale: Locale, o: { name?: string | null; app: string; inviter: string | null; link: string }): RenderedEmail {
  const { t, dir } = translatorFor(locale, "emails");
  return renderEmail(locale, dir, t("invite.subject", { app: o.app }), [
    hi(t, o.name),
    o.inviter ? t("invite.body", { inviter: o.inviter, app: o.app }) : t("invite.bodyPlatform", { app: o.app }),
    { text: t("invite.cta"), link: o.link },
    t("invite.expires"),
  ]);
}

/** A password link an admin or reseller made for them. */
export function resetLinkEmail(locale: Locale, o: { name?: string | null; app: string; link: string }): RenderedEmail {
  const { t, dir } = translatorFor(locale, "emails");
  return renderEmail(locale, dir, t("reset.subject", { app: o.app }), [
    hi(t, o.name),
    { text: t("reset.issuedBody", { app: o.app }), link: o.link },
    t("reset.issuedExpires"),
  ]);
}

/** "Forgot password": the link they asked for themselves. */
export function forgotPasswordEmail(locale: Locale, o: { name?: string | null; app: string; link: string }): RenderedEmail {
  const { t, dir } = translatorFor(locale, "emails");
  return renderEmail(locale, dir, t("reset.subject", { app: o.app }), [
    hi(t, o.name),
    t("reset.forgotBody", { app: o.app }),
    { link: o.link },
    t("reset.forgotExpires"),
  ]);
}

/** A reseller's shared monthly AI actions reached 80% or 100%. */
export function aiQuotaEmail(locale: Locale, o: { name?: string | null; reseller: string; level: 80 | 100; used: number; max: number; resetsOn: Date }): RenderedEmail {
  const { t, dir, format } = translatorFor(locale, "emails");
  const resets = format.dateTime(o.resetsOn, { month: "long", day: "numeric", timeZone: "UTC" });
  const values = { reseller: o.reseller, used: o.used, max: o.max, resets };
  return renderEmail(
    locale,
    dir,
    o.level === 100 ? t("aiQuota.subjectFull", values) : t("aiQuota.subject80", values),
    [hi(t, o.name), o.level === 100 ? t("aiQuota.bodyFull", values) : t("aiQuota.body80", values), `${t("aiQuota.includes")}\n${t("aiQuota.raise")}`],
    false,
  );
}

/** Someone sent something through the owner's published app. */
export function ownerAlertEmail(
  locale: Locale,
  o: { test: boolean; app: string; label: string; tableLabel: string; headline: string; fields: Array<{ name: string; value: string }>; link: string; replyTo: string | null },
): RenderedEmail {
  const { t, dir } = translatorFor(locale, "emails");
  const subject = o.headline
    ? t(o.test ? "alert.subjectHeadlineTest" : "alert.subjectHeadline", { label: o.label, headline: o.headline })
    : t(o.test ? "alert.subjectTest" : "alert.subject", { label: o.label });
  const blocks: EmailBlock[] = [o.test ? t("alert.introTest", { app: o.app }) : t("alert.intro", { label: o.label, app: o.app })];
  if (o.fields.length) blocks.push(o.fields.map((f) => t("alert.field", { name: f.name, value: f.value })).join("\n"));
  blocks.push({ text: t("alert.see"), link: o.link });
  if (o.replyTo) blocks.push(t("alert.reply", { email: o.replyTo }));
  blocks.push(t("alert.footer", { table: o.tableLabel }));
  return renderEmail(locale, dir, subject, blocks, false);
}

/** The alerts held back in a busy hour, summed up in one email. */
export function ownerAlertSummaryEmail(locale: Locale, o: { app: string; held: number; link: string }): RenderedEmail {
  const { t, dir } = translatorFor(locale, "emails");
  return renderEmail(
    locale,
    dir,
    t("alertSummary.subject", { count: o.held, app: o.app }),
    [t("alertSummary.body", { count: o.held, app: o.app }), { text: t("alertSummary.heldBack"), link: o.link }],
    false,
  );
}

/** Admin · Settings · Email: "Send a test email to me". */
export function testEmail(locale: Locale, o: { app: string; from: string }): RenderedEmail {
  const { t, dir } = translatorFor(locale, "emails");
  return renderEmail(locale, dir, t("test.subject", { app: o.app }), [t("test.hello"), t("test.body", { app: o.app, from: o.from }), t("test.noReply")]);
}
