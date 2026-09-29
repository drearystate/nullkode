import { db } from "../db";
import type { DataSource } from "@prisma/client";
import { postgresAdapter } from "./postgres";
import { sheetsAdapter } from "./sheets";

export type QueryOpts = {
  where?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
};

export type AggregateOpts = {
  groupBy?: string;
  aggregate?: string;
  where?: Record<string, unknown>;
  orderBy?: string;
  limit?: number;
};

export type DataAdapter = {
  list(source: DataSource, table: string, opts: QueryOpts): Promise<Array<Record<string, unknown>>>;
  insert(source: DataSource, table: string, values: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(
    source: DataSource,
    table: string,
    where: Record<string, unknown>,
    values: Record<string, unknown>
  ): Promise<number>;
  remove(source: DataSource, table: string, where: Record<string, unknown>): Promise<number>;
  rawQuery?(source: DataSource, table: string, opts: AggregateOpts): Promise<Array<Record<string, unknown>>>;
};

export async function getAdapter(datasourceId: string): Promise<{ source: DataSource; adapter: DataAdapter }> {
  const source = await db.dataSource.findUnique({ where: { id: datasourceId } });
  if (!source) throw new Error(`Data source ${datasourceId} not found`);
  if (source.kind === "POSTGRES_INTERNAL" || source.kind === "POSTGRES_EXTERNAL") {
    return { source, adapter: postgresAdapter };
  }
  if (source.kind === "GOOGLE_SHEETS") {
    return { source, adapter: sheetsAdapter };
  }
  throw new Error(`Unsupported data source kind: ${source.kind}`);
}
