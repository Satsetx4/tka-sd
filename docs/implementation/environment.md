# Environment configuration

`DATABASE_URL` is a server-only secret. Set it separately for each deployment environment. The app has no client-safe environment variables at M0-B; never rename the database credential to `NEXT_PUBLIC_DATABASE_URL` or pass it to browser code.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Replace the placeholder with a dedicated non-production Neon connection string.
3. Keep `.env.local` out of Git; `.gitignore` already excludes `.env*` except `.env.example`.

Local development must not use the production branch or production database. The app does not fall back from a missing `DATABASE_URL` to another value. Database access fails with a generic configuration error until a valid PostgreSQL URL is set.

## Preview / staging

Configure `DATABASE_URL` in the hosting provider's Preview environment scope only, and point it to a separate non-production Neon branch or project. Do not set the same variable for all environments and do not copy the Production value into Preview. If Preview has no URL, the database helper fails closed instead of selecting Production.

## Production

Configure the Production `DATABASE_URL` only in the Production environment scope, using the production Neon branch. Keep production credentials out of local files, preview settings, client bundles, and source control.

## Validation behavior

`src/config/server-env.ts` is marked `server-only` and validates `DATABASE_URL` with Zod only when called. It accepts PostgreSQL URL schemes and returns a generic error without echoing the credential. No public environment variables are required for M0-B.
