// Preferences — backs window.codesign.preferences.{get,update}.

import { db } from "../db";

export interface Preferences {
  updateChannel: "stable" | "beta";
  generationTimeoutSec: number;
  checkForUpdatesOnStartup: boolean;
  dismissedUpdateVersion: string;
  diagnosticsLastReadTs: number;
  memoryEnabled: boolean;
  workspaceMemoryAutoUpdate: boolean;
  userMemoryAutoUpdate: boolean;
  locale: string;
  activeProviderId: string | null;
  activeModelPrimary: string | null;
  designSystemJson: unknown | null;
}

const DEFAULTS: Preferences = {
  updateChannel: "stable",
  generationTimeoutSec: 1200,
  checkForUpdatesOnStartup: false,
  dismissedUpdateVersion: "",
  diagnosticsLastReadTs: 0,
  memoryEnabled: true,
  workspaceMemoryAutoUpdate: true,
  userMemoryAutoUpdate: true,
  locale: "en",
  activeProviderId: null,
  activeModelPrimary: null,
  designSystemJson: null,
};

type Row = Awaited<ReturnType<typeof db.designerPreferences.findUnique>>;

function toWire(row: NonNullable<Row>): Preferences {
  return {
    updateChannel: (row.updateChannel === "beta" ? "beta" : "stable") as Preferences["updateChannel"],
    generationTimeoutSec: row.generationTimeoutSec,
    checkForUpdatesOnStartup: row.checkForUpdatesOnStartup,
    dismissedUpdateVersion: row.dismissedUpdateVersion,
    diagnosticsLastReadTs: Number(row.diagnosticsLastReadTs),
    memoryEnabled: row.memoryEnabled,
    workspaceMemoryAutoUpdate: row.workspaceMemoryAutoUpdate,
    userMemoryAutoUpdate: row.userMemoryAutoUpdate,
    locale: row.locale,
    activeProviderId: row.activeProviderId,
    activeModelPrimary: row.activeModelPrimary,
    designSystemJson: row.designSystemJson,
  };
}

export async function getPreferences(userId: string): Promise<Preferences> {
  const row = await db.designerPreferences.findUnique({ where: { userId } });
  if (!row) return DEFAULTS;
  return toWire(row);
}

export async function setPreferences(
  userId: string,
  patch: Partial<Preferences>,
): Promise<Preferences> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === "diagnosticsLastReadTs") {
      data[k] = typeof v === "number" ? BigInt(v) : v;
    } else {
      data[k] = v;
    }
  }
  const row = await db.designerPreferences.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return toWire(row);
}
