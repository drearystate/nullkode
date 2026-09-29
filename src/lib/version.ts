import pkg from "../../package.json";

/** The app version from package.json (shown on /api/health and Admin > System). */
export const APP_VERSION: string = (pkg as { version?: string }).version ?? "0.0.0";

/**
 * Where "Open a bug report" goes: package.json's bugs.url, when it points at
 * a real project (the release package drops the placeholder).
 */
export function bugReportUrl(): string | null {
  const url = (pkg as { bugs?: { url?: string } | string }).bugs;
  const raw = typeof url === "string" ? url : url?.url;
  if (!raw || /YOUR_ORG/i.test(raw) || !/^https:\/\//.test(raw)) return null;
  return raw.replace(/\/+$/, "");
}
