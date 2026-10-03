import { readFile } from "node:fs/promises";

/**
 * Client of the Android preview service (services/native-emulator/server.mjs):
 * the NullKode server asks it for an emulator for an owner and hands the
 * owner the viewer address. The service listens on 127.0.0.1 only; this
 * module talks to it with the shared secret. See nk-plan/native-infra.md.
 *
 * Environment:
 * - NK_EMU_URL      the service's control address (default http://127.0.0.1:8795)
 * - NK_EMU_SECRET   the shared secret (or NK_EMU_SECRET_FILE: a file holding it)
 * - NK_EMU_PUBLIC   public origin + path prefix the reverse proxy forwards to
 *                   the service (default: same origin as the studio, the
 *                   service's own /nk-native/emulator paths)
 * - NK_EMU_EXPO_ORIGIN  origin the emulators use to reach this server for Expo
 *                   Go links (default: the request's origin; e.g.
 *                   http://10.0.2.2:3001 to stay on the machine)
 */

export type EmulatorSession = {
  id: string;
  owner: string;
  project: string;
  state: "booting" | "opening" | "ready" | "error" | "stopping";
  error: string | null;
  /** Path of the viewer page on the service (token included). */
  viewerPath: string;
  createdAt: string;
  readyAt: string | null;
  bootMs: number | null;
  expiresAt: string;
  viewers: number;
  rssMb: number | null;
  cpuPercent: number | null;
};

export class EmulatorUnavailable extends Error {}
export class EmulatorBusy extends Error {}

async function secret(): Promise<string | null> {
  if (process.env.NK_EMU_SECRET) return process.env.NK_EMU_SECRET;
  if (process.env.NK_EMU_SECRET_FILE) return (await readFile(process.env.NK_EMU_SECRET_FILE, "utf8").catch(() => "")).trim() || null;
  return null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const key = await secret();
  if (!key) throw new EmulatorUnavailable("NK_EMU_SECRET is not set");
  const base = (process.env.NK_EMU_URL || "http://127.0.0.1:8795").replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: { authorization: `Bearer ${key}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new EmulatorUnavailable(`The Android preview service is not reachable: ${(err as Error).message}`);
  }
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

/** Whether the service is configured and answers. */
export async function emulatorServiceReady(): Promise<boolean> {
  try {
    return (await call("GET", "/api/sessions")).status === 200;
  } catch {
    return false;
  }
}

/**
 * Starts (or reuses) the owner's emulator showing an APK or an Expo Go link.
 * Throws EmulatorBusy when every emulator is in use, EmulatorUnavailable when
 * the service isn't running.
 */
export async function startEmulatorSession(input: { ownerId: string; projectId: string; apkPath?: string; expoUrl?: string }): Promise<EmulatorSession> {
  const { status, data } = await call<EmulatorSession & { error?: string }>("POST", "/api/sessions", {
    owner: input.ownerId,
    project: input.projectId,
    ...(input.apkPath ? { apk: input.apkPath } : {}),
    ...(input.expoUrl ? { expoUrl: input.expoUrl } : {}),
  });
  if (status === 429) throw new EmulatorBusy("busy");
  if (status !== 200) throw new EmulatorUnavailable(String(data.error ?? status));
  return data;
}

/** The owner's current session, if any. */
export async function ownerEmulatorSession(ownerId: string): Promise<EmulatorSession | null> {
  const { status, data } = await call<{ sessions: EmulatorSession[] }>("GET", "/api/sessions");
  if (status !== 200) return null;
  return data.sessions.find((s) => s.owner === ownerId && s.state !== "stopping") ?? null;
}

export async function stopEmulatorSession(id: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{16}$/.test(id)) return;
  await call("DELETE", `/api/sessions/${id}`);
}

/** The address a browser opens for a session's viewer. */
export function viewerUrl(session: Pick<EmulatorSession, "viewerPath">, requestOrigin: string): string {
  const pub = process.env.NK_EMU_PUBLIC;
  if (pub) {
    // NK_EMU_PUBLIC replaces the service's own path prefix.
    const u = new URL(pub);
    return `${u.origin}${u.pathname.replace(/\/+$/, "")}${session.viewerPath.replace(/^\/nk-native\/emulator/, "")}`;
  }
  return `${requestOrigin.replace(/\/+$/, "")}${session.viewerPath}`;
}
