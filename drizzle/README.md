# Migration output

This directory is the Drizzle Kit output path. Migration `0000_extensions_and_primitives` is the first checkpoint migration; keep subsequent migrations in the documented order and never edit a migration after it has shipped.

Apply migrations through `pnpm db:migrate` against the authorized non-production branch. Do not use schema push or manual DDL against production.
