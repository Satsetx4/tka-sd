<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## TKA SD repository constraints

- Use pnpm for package and script operations.
- Keep this checkpoint within M0-A: the Next.js application shell and developer tooling only.
- Do not add Neon, Drizzle, database connections, schemas, migrations, seeds, or database commands during M0-A.
- Do not add M1 content management, practice, tryout, analytics, payment, parent dashboard, AI, teacher, or school features.
- The original Product Blueprint, Implementation Specification, taxonomy seed, ERD, migration plan, and M0 backlog are not present in the repository or referenced conversation attachments. Do not reconstruct them or invent product and architecture decisions from partial conversation summaries.
- Read `docs/README.md` before changing product scope. Treat the Product Blueprint as authoritative and the Implementation Specification as subordinate to it once the original documents are imported and reviewed.
- Keep the current app structure minimal: Next.js routes, root layout, and global styles live in `src/app`. Do not add domain-specific folders until the authoritative Implementation Specification defines them.
- Use TypeScript strict mode, Tailwind CSS, and React Server Components by default. Add client components only when an interaction requires them.
- Do not hardcode learner names, scores, grades, or completion states.
- Keep credentials out of source control. `.env.example` may contain safe placeholders only; never commit populated `.env` files.
- Before starting another project checkpoint or expanding scope, wait for an explicit user request.

## M0-A validation commands

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
