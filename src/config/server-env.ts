import "server-only";
import { parseServerEnv, type ServerEnv } from "./server-env-schema";

export type { ServerEnv } from "./server-env-schema";

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

export function getDatabaseUrl(): string {
  return getServerEnv().DATABASE_URL;
}
