/**
 * Shared by the admin email routes: the admin check, reading the saved
 * settings for the form (secrets masked), and validating what the form sends.
 */
import { z } from "zod";
import { getRealUser } from "@/lib/auth";
import { maskSecret, SETTING_KEYS } from "@/lib/settings";
import {
  emailStatus,
  getEmailStats,
  isEmailAddress,
  parseAddress,
  readStoredEmailSettings,
  SMTP_PORTS,
  type StoredEmailSettings,
} from "@/lib/mailer";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { renderMsg, requestErrorsT } from "@/lib/errors-i18n";

/** Messages for the admin email routes, in the admin's language. */
export type ApiT = (key: string, values?: Record<string, string | number>) => string;
export async function apiT(): Promise<ApiT> {
  return (await getTranslations({ locale: await requestLocale(), namespace: "admin.api" })) as unknown as ApiT;
}

export async function requireAdmin() {
  const user = await getRealUser();
  if (!user || user.role !== "ADMIN") return { error: json({ error: (await apiT())("emailAdminOnly") }, { status: 403 }) };
  return { user };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** What the settings form shows. Passwords and keys are never sent back, only masked. */
export async function emailSettingsView(adminEmail: string) {
  const s = await readStoredEmailSettings();
  const password = str(s[SETTING_KEYS.EMAIL_SMTP_PASSWORD]);
  const apiKey = str(s[SETTING_KEYS.EMAIL_RESEND_API_KEY]);
  const port = Number(s[SETTING_KEYS.EMAIL_SMTP_PORT]);
  const [status, stats, t] = await Promise.all([emailStatus(), getEmailStats(), apiT()]);
  if (status.problemCode) status.problem = t(`emailProblem.${status.problemCode}`);
  // The last error is stored in English; shown in the admin's language when it was stored as a message too.
  if (stats.lastErrorMsg) stats.lastError = renderMsg(stats.lastErrorMsg, await requestErrorsT());
  delete stats.lastErrorMsg;
  return {
    settings: {
      provider: str(s[SETTING_KEYS.EMAIL_PROVIDER]) as "smtp" | "resend" | "",
      smtp: {
        host: str(s[SETTING_KEYS.EMAIL_SMTP_HOST]),
        port: Number.isInteger(port) && port > 0 ? port : 587,
        security: (str(s[SETTING_KEYS.EMAIL_SMTP_SECURITY]) || "auto") as "auto" | "ssl" | "starttls",
        user: str(s[SETTING_KEYS.EMAIL_SMTP_USER]),
        passwordSet: password.length > 0,
        passwordMask: maskSecret(password, SETTING_KEYS.EMAIL_SMTP_PASSWORD),
      },
      resend: { apiKeySet: apiKey.length > 0, apiKeyMask: maskSecret(apiKey, SETTING_KEYS.EMAIL_RESEND_API_KEY) },
      from: str(s[SETTING_KEYS.EMAIL_FROM]),
      fromName: str(s[SETTING_KEYS.EMAIL_FROM_NAME]),
    },
    // Which server-file (.env) values exist; never their secret values.
    env: {
      smtpHost: process.env.SMTP_HOST?.trim() || null,
      smtpPasswordSet: Boolean(process.env.SMTP_PASSWORD || process.env.SMTP_PASS),
      resendKeySet: Boolean(process.env.RESEND_API_KEY?.trim()),
      from: parseAddress(process.env.SMTP_FROM)?.address ?? parseAddress(process.env.DEFAULT_EMAIL_FROM)?.address ?? null,
    },
    status,
    stats,
    adminEmail,
    ports: SMTP_PORTS,
  };
}

const HOST_RE = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

export const EmailSettingsBody = z.object({
  provider: z.enum(["smtp", "resend"]),
  smtp: z
    .object({
      host: z.string().max(300).optional(),
      port: z.union([z.number(), z.string().max(6)]).optional(),
      security: z.enum(["auto", "ssl", "starttls"]).optional(),
      user: z.string().max(254).optional(),
      /** Blank keeps the saved password. */
      password: z.string().max(500).optional(),
    })
    .optional(),
  resend: z.object({ apiKey: z.string().max(300).optional() }).optional(),
  from: z.string().max(320).optional(),
  fromName: z.string().max(120).optional(),
});
export type EmailSettingsInput = z.infer<typeof EmailSettingsBody>;

/**
 * Checks the form and turns it into Setting values. Blank password or key
 * fields keep what is saved. Returns a plain-language error for the form.
 */
export function validateEmailSettings(input: EmailSettingsInput, saved: StoredEmailSettings, t: ApiT): { error: string } | { values: Record<string, string | number> } {
  const values: Record<string, string | number> = { [SETTING_KEYS.EMAIL_PROVIDER]: input.provider };
  const fromParsed = input.from?.trim() ? parseAddress(input.from) : null;
  if (input.from?.trim() && !fromParsed) return { error: t("emailBadFrom") };
  const fromName = (input.fromName ?? fromParsed?.name ?? "").replace(/[\r\n\t<>"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

  if (input.provider === "smtp") {
    let host = (input.smtp?.host ?? "").trim().replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "");
    let port = input.smtp?.port === undefined || input.smtp.port === "" ? 587 : Number(input.smtp.port);
    const hostPort = host.match(/^(.*):(\d{1,5})$/);
    if (hostPort) {
      host = hostPort[1];
      if (input.smtp?.port === undefined || input.smtp.port === "") port = Number(hostPort[2]);
    }
    if (!host) return { error: t("emailAddHost") };
    if (!HOST_RE.test(host)) return { error: t("emailBadHost") };
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: t("emailBadPort") };
    const user = (input.smtp?.user ?? "").trim();
    const newPassword = input.smtp?.password ?? "";
    const savedPassword = str(saved[SETTING_KEYS.EMAIL_SMTP_PASSWORD]);
    if (user && !newPassword && !savedPassword) return { error: t("emailAddPassword") };
    const from = fromParsed?.address ?? (isEmailAddress(user) ? user : "");
    if (!from) return { error: t("emailAddFrom") };
    values[SETTING_KEYS.EMAIL_SMTP_HOST] = host.toLowerCase();
    values[SETTING_KEYS.EMAIL_SMTP_PORT] = port;
    values[SETTING_KEYS.EMAIL_SMTP_SECURITY] = input.smtp?.security ?? (port === 465 ? "ssl" : "auto");
    values[SETTING_KEYS.EMAIL_SMTP_USER] = user;
    if (newPassword) values[SETTING_KEYS.EMAIL_SMTP_PASSWORD] = newPassword;
    else if (!user) values[SETTING_KEYS.EMAIL_SMTP_PASSWORD] = "";
    values[SETTING_KEYS.EMAIL_FROM] = from;
  } else {
    const key = (input.resend?.apiKey ?? "").trim();
    if (!key && !str(saved[SETTING_KEYS.EMAIL_RESEND_API_KEY]) && !process.env.RESEND_API_KEY?.trim()) return { error: t("emailAddResendKey") };
    if (key && !/^[A-Za-z0-9_\-.]{8,300}$/.test(key)) return { error: t("emailBadResendKey") };
    if (!fromParsed) return { error: t("emailAddResendFrom") };
    if (key) values[SETTING_KEYS.EMAIL_RESEND_API_KEY] = key;
    values[SETTING_KEYS.EMAIL_FROM] = fromParsed.address;
  }
  values[SETTING_KEYS.EMAIL_FROM_NAME] = fromName;
  return { values };
}
