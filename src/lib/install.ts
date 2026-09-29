import { timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { getSetting, setSetting, SETTING_KEYS } from "./settings";
import { getRealUser } from "./auth";

export const INSTALL_OWNER_KEY = "install.ownerId";

export async function isInstallComplete(): Promise<boolean> {
  if (await getSetting<string>(SETTING_KEYS.INSTALL_COMPLETED_AT)) return true;
  // An owner created by the wizard must still be able to finish setup.
  if (await getSetting<string>(INSTALL_OWNER_KEY)) return false;
  // Preserve pre-wizard installations during upgrades.
  return Boolean(await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } }));
}

export function validInstallToken(input: unknown): boolean {
  const expected = process.env.INSTALL_TOKEN;
  if (!expected || expected.length < 32 || typeof input !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(input);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isInstallOwner(): Promise<boolean> {
  const [user, ownerId] = await Promise.all([getRealUser(), getSetting<string>(INSTALL_OWNER_KEY)]);
  return Boolean(user && user.role === "ADMIN" && user.id === ownerId);
}

export async function markInstallComplete(): Promise<void> {
  await setSetting(SETTING_KEYS.INSTALL_COMPLETED_AT, new Date().toISOString());
}

/** Kept for callers from earlier releases; install state is no longer cached. */
export function _resetInstallCache(): void {}
