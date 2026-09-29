import { z } from "zod";
import { aiUsageSummary, checkAiQuota, recordAiUsage, refundFailedAi } from "@/lib/ai-quota";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { providerEditPage } from "@/lib/ai/provider";
import { postgresAdapter } from "@/lib/datasources/postgres";
import { aiErrorFor, classifyAiFailure } from "@/lib/ai/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  projectId: z.string().min(1),
  message: z.string().max(2000).optional(),
});

type FieldType = "text" | "int" | "float" | "bool" | "timestamp" | "json";
type TableSchemaShape = { fields?: Array<{ name?: unknown; type?: unknown }> };

const ROWS_PER_TABLE = 6;
const RESERVED_COLS = new Set(["id", "created_at", "updated_at"]);

/**
 * Fast-path "add sample data" — does NOT regenerate the page. Picks
 * realistic-looking rows for every project table and bulk-inserts them via
 * the same Postgres adapter the flow runtime uses. Skips the auth `users`
 * table by default (seeding fake users breaks login). Returns counts only;
 * the editor canvas is left untouched.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const quota = await checkAiQuota(user);
  if (quota) return quota;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
  const { projectId, message } = parsed.data;

  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return json({ error: "Project not found" }, { status: 404 });

  const datasource = await db.dataSource.findFirst({
    where: { projectId, kind: "POSTGRES_INTERNAL" },
  });
  if (!datasource) {
    return json(
      { error: "This project has no database yet — add a feature first." },
      { status: 400 }
    );
  }

  const tableRows = await db.dataTable.findMany({
    where: { datasourceId: datasource.id },
    select: { name: true, schema: true },
  });

  // Skip the auth users table — seeding fake bcrypt-less users would break
  // login/registration silently. If users need test accounts they should
  // register through the real flow.
  const tables = tableRows
    // "auth_users" (and "auth_users_2" after a reinstall) is the sign-in
    // module's table; "users" is the older name.
    .filter((t) => !/^(?:auth_)?users(?:_\d+)?$/.test(t.name))
    .map((t) => {
      const s = (t.schema as TableSchemaShape) ?? {};
      return {
        name: t.name,
        fields: (s.fields ?? [])
          .map((f) => ({
            name: typeof f.name === "string" ? f.name : "",
            type:
              typeof f.type === "string" ? (f.type as FieldType) : ("text" as FieldType),
          }))
          .filter((f) => f.name && !RESERVED_COLS.has(f.name)),
      };
    })
    .filter((t) => t.fields.length > 0);

  if (tables.length === 0) {
    return json(
      { error: "No tables to populate — create a feature first, then try again." },
      { status: 400 }
    );
  }

  // Charged only now that there is something to fill (the checks above
  // cost nothing), and given back if no rows come of it.
  const chargeId = await recordAiUsage(user.id, "seed", projectId);
  const usage = () => aiUsageSummary(user).catch(() => null);

  // Prompt the model for rows. Keep it tiny — no design system rules, no
  // HTML, no flow node docs. Just the table list and a short instruction.
  const SYSTEM = `You produce realistic sample rows for relational tables. Return a single JSON object that matches the schema. Rules:
- For every table provided, produce exactly ${ROWS_PER_TABLE} rows.
- Each row is itself a JSON-stringified object (the schema says rows is an array of STRINGS — each string must parse as a JSON object).
- Inside each row object, keys MUST be a subset of the table's declared field names. Never invent columns.
- Match the declared type: text → strings, int → integers, float → numbers, bool → true/false, timestamp → ISO-8601 string, json → small nested JSON object.
- NEVER include id, created_at, or updated_at — they are auto-managed.
- Make rows coherent across tables: if one table references another by name (e.g. user_id, product_id), use plausible matching values; real foreign keys are not enforced.
- Make values realistic and varied — product names, prices, dates, locations etc. should look like real-world data, not "foo bar baz".

Example row string for a table with fields (name: text, price: float, in_stock: bool):
"{\\"name\\":\\"Cotton T-shirt\\",\\"price\\":24.99,\\"in_stock\\":true}"`;

  const USER = `TABLES:
${tables
  .map(
    (t) =>
      `- ${t.name}: ${t.fields.map((f) => `${f.name} (${f.type})`).join(", ")}`
  )
  .join("\n")}

${message ? `User context: ${message}\n\n` : ""}Return the JSON object now. No prose, no markdown.`;

  // OpenAI strict mode forbids arbitrary-key objects (additionalProperties
  // must be `false`), so each row is sent as a JSON-stringified object and
  // parsed below. Keeps the strict schema happy while still letting the
  // model pick whatever column names match the table.
  const SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["tables"],
    properties: {
      tables: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "rows"],
          properties: {
            name: { type: "string" },
            rows: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
  } as const;

  let content: string;
  try {
    content = await providerEditPage({ systemPrompt: SYSTEM, userText: USER, jsonSchema: SCHEMA, schemaName: "nullkode_seed_data", maxCompletionTokens: 8000 });
  } catch (err) {
    const refunded = await refundFailedAi(chargeId, user.id, classifyAiFailure(err));
    return json(
      {
        error: aiErrorFor(user, err, "The AI couldn't make sample data. Please try again."),
        refunded,
        usage: await usage(),
      },
      { status: 500 }
    );
  }

  let parsedRows: { tables: Array<{ name: string; rows: string[] }> };
  try {
    parsedRows = JSON.parse(content);
  } catch {
    const refunded = await refundFailedAi(chargeId, user.id, "unusable");
    return json({ error: `The AI's sample data couldn't be read. Please try again.${refunded ? " This one didn't count." : ""}`, refunded, usage: await usage() }, { status: 500 });
  }

  const byName = new Map(tables.map((t) => [t.name, t]));
  const insertedCounts: Array<{ table: string; count: number }> = [];

  for (const block of parsedRows.tables ?? []) {
    const def = byName.get(block.name);
    if (!def) continue;
    const allowed = new Set(def.fields.map((f) => f.name));
    // Per-user tables filter list-flows by user_id = session.userId, so
    // seeded rows with random user_ids are invisible on the previewing
    // user's dashboard. Force every seeded user_id to the current user
    // so the data actually shows up.
    const hasUserId = allowed.has("user_id");
    let count = 0;
    for (const rowStr of block.rows ?? []) {
      // Each row arrives as a JSON-stringified object — see SCHEMA above.
      let row: Record<string, unknown>;
      try {
        const parsed = JSON.parse(rowStr);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
        row = parsed as Record<string, unknown>;
      } catch {
        continue;
      }
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!allowed.has(k)) continue;
        if (RESERVED_COLS.has(k)) continue;
        clean[k] = coerce(v, def.fields.find((f) => f.name === k)?.type ?? "text");
      }
      if (hasUserId) clean.user_id = user.id;
      if (Object.keys(clean).length === 0) continue;
      try {
        await postgresAdapter.insert(datasource, def.name, clean);
        count++;
      } catch {
        // Skip a single bad row rather than failing the whole batch.
      }
    }
    if (count > 0) insertedCounts.push({ table: def.name, count });
  }

  const total = insertedCounts.reduce((s, t) => s + t.count, 0);
  // Nothing usable came back: the action doesn't count.
  const refunded = total === 0 ? await refundFailedAi(chargeId, user.id, "unusable") : false;
  const explanation =
    total > 0
      ? `Added ${total} sample ${total === 1 ? "row" : "rows"} across ${
          insertedCounts.length
        } ${insertedCounts.length === 1 ? "table" : "tables"}.`
      : `No sample rows were added (the AI didn't return any rows that fit your tables).${refunded ? " It wasn't counted." : ""}`;

  return json({
    explanation,
    refunded,
    usage: await usage(),
    insertedCounts,
    // Echo nulls for html/css so the client knows not to touch the canvas.
    html: null,
    css: null,
    createdTables: [],
    createdFlowSlugs: [],
    updatedPages: [],
    suggestions: [],
  });
}

function coerce(v: unknown, type: FieldType): unknown {
  if (v === null || v === undefined) return null;
  switch (type) {
    case "int": {
      const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v), 10);
      return Number.isFinite(n) ? n : null;
    }
    case "float": {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    }
    case "bool":
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v.toLowerCase() === "true";
      return Boolean(v);
    case "timestamp":
      return typeof v === "string" ? v : new Date().toISOString();
    case "json":
      return typeof v === "string" ? v : JSON.stringify(v);
    case "text":
    default:
      return typeof v === "string" ? v : String(v);
  }
}
