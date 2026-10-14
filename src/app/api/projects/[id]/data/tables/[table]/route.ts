import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { DataError, deleteRows, errorResponse, insertRow, parseRowQuery, readRows, updateRow } from "../../_lib/tables";
import { noteEdit } from "@/lib/sharing/audit";

type Ctx = { params: Promise<{ id: string; table: string }> };

async function body(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") throw new DataError("invalidInput");
  return b as Record<string, unknown>;
}

/** A page of rows: ?page=&pageSize=(≤200)&search=&sort=&dir=asc|desc */
export async function GET(req: Request, ctx: Ctx) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id, "edit");
  if ("error" in r) return r.error;
  try {
    return json(await readRows(id, table, parseRowQuery(new URL(req.url))));
  } catch (err) {
    return errorResponse(err);
  }
}

/** Add a row: { values: { column: value } } */
export async function POST(req: Request, ctx: Ctx) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id, "edit");
  if ("error" in r) return r.error;
  try {
    const b = await body(req);
    const row = await insertRow(id, table, b.values ?? {});
    await noteEdit("app", id, r.user.id, "data.change", { subjectId: `${id}:${table}`, label: table });
    return json({ row });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Change a row: { id, values: { column: value } } */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id, "edit");
  if ("error" in r) return r.error;
  try {
    const b = await body(req);
    const row = await updateRow(id, table, b.id, b.values);
    await noteEdit("app", id, r.user.id, "data.change", { subjectId: `${id}:${table}`, label: table });
    return json({ row });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Delete rows: { ids: [...] } */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id, "edit");
  if ("error" in r) return r.error;
  try {
    const b = await body(req);
    const deleted = await deleteRows(id, table, b.ids);
    await noteEdit("app", id, r.user.id, "data.change", { subjectId: `${id}:${table}`, label: table });
    return json({ deleted });
  } catch (err) {
    return errorResponse(err);
  }
}
