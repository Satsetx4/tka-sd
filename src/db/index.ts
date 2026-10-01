import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "@/config/server-env";
import * as schema from "./schema";

function createDatabase(connectionString: string) {
  const client = neon(connectionString);
  return drizzle({ client, schema });
}

let database: ReturnType<typeof createDatabase> | undefined;

export function getDb() {
  database ??= createDatabase(getDatabaseUrl());
  return database;
}
