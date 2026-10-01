import "server-only";
import { z } from "zod";

const databaseUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  });

const serverEnvSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!result.success) {
    throw new Error(
      "DATABASE_URL is missing or invalid for this server environment.",
    );
  }

  return result.data;
}

export function getDatabaseUrl(): string {
  return getServerEnv().DATABASE_URL;
}
