import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { DataError, deleteRows, errorResponse, insertRow, parseRowQuery, readRows, updateRow } from "../../_lib/tables";

type Ctx = { params: Promise<{ id: string; table: string }> };

async function body(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") throw new DataError("Invalid input");
  return b as Record<string, unknown>;
}

/** A page of rows: ?page=&pageSize=(≤200)&search=&sort=&dir=asc|desc */
export async function GET(req: Request, ctx: Ctx) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id);
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
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  try {
    const b = await body(req);
    return json({ row: await insertRow(id, table, b.values ?? {}) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Change a row: { id, values: { column: value } } */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  try {
    const b = await body(req);
    return json({ row: await updateRow(id, table, b.id, b.values) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Delete rows: { ids: [...] } */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id, table } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  try {
    const b = await body(req);
    return json({ deleted: await deleteRows(id, table, b.ids) });
  } catch (err) {
    return errorResponse(err);
  }
}
