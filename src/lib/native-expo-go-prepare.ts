import { join } from "node:path";
import { closeLog, engineCacheRoot, ensureEngineExport, openLog, type EngineExport } from "@/lib/native-engine";

/**
 * Makes the engine's Expo Go export in the background (once per engine JS
 * version; concurrent calls share one run). Resolves to null when it failed;
 * the log is <engine cache>/export.log.
 */
let running: Promise<EngineExport | null> | null = null;
export function prepareEngineExport(): Promise<EngineExport | null> {
  if (running) return running;
  running = (async () => {
    const log = await openLog(join(engineCacheRoot(), "export.log"));
    try {
      return await ensureEngineExport(log);
    } catch (err) {
      console.error("[expo-go] engine export failed:", err);
      return null;
    } finally {
      await closeLog(log);
      running = null;
    }
  })();
  return running;
}
