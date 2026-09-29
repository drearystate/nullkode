import { db } from "../db";

/** A feature already added to an app, and how many copies of it there are. */
export type InstalledModule = { moduleId: string; count: number };

/** What the feature galleries (Features tab and the editor's panel) mark as "Added". */
export async function installedModules(projectId: string): Promise<InstalledModule[]> {
  const rows = await db.projectModule.groupBy({
    by: ["moduleId"],
    where: { projectId },
    _count: { _all: true },
  });
  return rows.map((r) => ({ moduleId: r.moduleId, count: r._count._all }));
}
