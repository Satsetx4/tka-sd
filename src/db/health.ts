import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export async function checkDatabaseHealth(): Promise<void> {
  await getDb().execute(sql`select 1`);
}
