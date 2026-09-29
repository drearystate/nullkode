import argon2 from "argon2";
import { db } from "./db";
import { getAdapter } from "./datasources";

/**
 * The owner's own admin login for an app built with sign-in (the auth
 * module). Apps no longer ship with sample accounts, so this is how an owner
 * gets into their app's admin-only pages: they choose the email and password
 * here, and it is stored like any account the app's sign-up creates.
 */

type UsersTable = { datasourceId: string; table: string };

/** The app's accounts table, if the app has sign-in. */
export async function appUsersTable(projectId: string): Promise<UsersTable | null> {
  const tables = await db.dataTable.findMany({
    where: { datasource: { projectId, kind: "POSTGRES_INTERNAL" }, name: { startsWith: "auth_users" } },
    select: { name: true, datasourceId: true, schema: true },
    orderBy: { createdAt: "asc" },
  });
  const table = tables.find((t) => {
    const fields = ((t.schema as { fields?: Array<{ name: string }> } | null)?.fields ?? []).map((f) => f.name);
    return ["email", "password_hash", "role"].every((f) => fields.includes(f));
  });
  return table ? { datasourceId: table.datasourceId, table: table.name } : null;
}

export async function listAppAdmins(projectId: string): Promise<string[] | null> {
  const users = await appUsersTable(projectId);
  if (!users) return null;
  const { source, adapter } = await getAdapter(users.datasourceId);
  const rows = await adapter.list(source, users.table, { where: { role: "admin" }, limit: 50 });
  return rows.map((r) => String(r.email ?? "")).filter(Boolean);
}

/** Create the admin account, or reset its password and make it an admin if it exists. */
export async function setAppAdmin(projectId: string, input: { email: string; password: string; name?: string }): Promise<"created" | "updated"> {
  const users = await appUsersTable(projectId);
  if (!users) throw new Error("This app doesn't have sign-in yet.");
  // Stored as typed: the app's own sign-in matches emails exactly.
  const email = input.email.trim();
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const { source, adapter } = await getAdapter(users.datasourceId);
  const existing = await adapter.list(source, users.table, { where: { email }, limit: 1 });
  if (existing.length) {
    await adapter.update(source, users.table, { email }, { password_hash: passwordHash, role: "admin" });
    return "updated";
  }
  await adapter.insert(source, users.table, { email, password_hash: passwordHash, name: input.name?.trim() || "Admin", role: "admin" });
  return "created";
}

/**
 * Older apps were created with two sample accounts that share one published
 * password. Remove any that still have it, so nobody can sign in to someone
 * else's app with the sample login. Accounts whose password was changed are
 * left alone.
 */
export const SAMPLE_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$vmzUnnPdXzhvD/uywCAESg$Tl+q2KYU9lpi3e8If3VxomRCKk4AVm2ME/bFZMFR+tQ";

/** Deletes accounts that still use the sample password, in every app. Returns how many. */
export async function removeSampleLogins(): Promise<number> {
  const tables = await db.$queryRaw<Array<{ table_schema: string; table_name: string }>>`
    SELECT table_schema, table_name FROM information_schema.columns
    WHERE column_name = 'password_hash' AND table_schema LIKE 'proj\\_%'`;
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  let removed = 0;
  for (const t of tables) {
    removed += await db.$executeRawUnsafe(`DELETE FROM ${q(t.table_schema)}.${q(t.table_name)} WHERE password_hash = $1`, SAMPLE_PASSWORD_HASH);
  }
  return removed;
}
