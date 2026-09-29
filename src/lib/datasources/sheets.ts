import { google } from "googleapis";
import type { DataSource } from "@prisma/client";
import type { DataAdapter } from "./index";

type Config = {
  spreadsheetId?: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
};

function client(source: DataSource) {
  const cfg = (source.config as Config) ?? {};
  if (!cfg.spreadsheetId) throw new Error("Sheets: missing spreadsheetId");

  if (cfg.accessToken) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
      access_token: cfg.accessToken,
      refresh_token: cfg.refreshToken,
    });
    return { api: google.sheets({ version: "v4", auth }), spreadsheetId: cfg.spreadsheetId };
  }

  if (cfg.apiKey) {
    return {
      api: google.sheets({ version: "v4", auth: cfg.apiKey }),
      spreadsheetId: cfg.spreadsheetId,
    };
  }

  throw new Error("Sheets: missing credentials (accessToken or apiKey)");
}

function parseRows(values: string[][] | null | undefined) {
  if (!values || values.length === 0) return [];
  const [header, ...rows] = values;
  return rows.map((row) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => {
      o[h] = row[i] ?? "";
    });
    return o;
  });
}

function matchWhere(row: Record<string, unknown>, where: Record<string, unknown> | undefined) {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined || v === "") continue;
    if (String(row[k]) !== String(v)) return false;
  }
  return true;
}

export const sheetsAdapter: DataAdapter = {
  async list(source, table, opts) {
    const { api, spreadsheetId } = client(source);
    const range = `${table}!A:Z`;
    const r = await api.spreadsheets.values.get({ spreadsheetId, range });
    const rows = parseRows(r.data.values as string[][] | null | undefined);
    const filtered = rows.filter((row) => matchWhere(row, opts.where));
    return filtered.slice(0, opts.limit ?? 100);
  },

  async insert(source, table, values) {
    const { api, spreadsheetId } = client(source);
    const headerRes = await api.spreadsheets.values.get({
      spreadsheetId,
      range: `${table}!1:1`,
    });
    const header = (headerRes.data.values?.[0] ?? []) as string[];
    const row = header.map((h) => (values[h] == null ? "" : String(values[h])));
    await api.spreadsheets.values.append({
      spreadsheetId,
      range: `${table}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    return values;
  },

  async update() {
    throw new Error("Sheets: update is not yet supported. Use a Postgres data source for writes.");
  },

  async remove() {
    throw new Error("Sheets: delete is not yet supported. Use a Postgres data source for writes.");
  },
};
