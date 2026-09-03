import { Pool } from "pg";
export interface Database { query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>; }
let pool: Pool | undefined;
export function database(): Database {
  const connectionString = process.env.BIM_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("BIM database is not configured");
  pool ??= new Pool({ connectionString, max: 3, connectionTimeoutMillis: 8000, idleTimeoutMillis: 20000 });
  return pool as Database;
}
