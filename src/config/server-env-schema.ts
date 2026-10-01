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

export function parseServerEnv(
  input: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      "DATABASE_URL is missing or invalid for this server environment.",
    );
  }

  return result.data;
}
