<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## TKA SD repository constraints

- Use pnpm for package and script operations.
- Keep this checkpoint within M0-A: the Next.js application shell and developer tooling only.
- M0-A.1 is limited to importing the original documents, updating the document register and guardrails, and running its specified validation commands. Do not begin M0-B or another checkpoint without an explicit user request.
- Keep commits scoped to the approved checkpoint; do not stage unrelated working-tree files.
- Do not add Neon, Drizzle, database connections, schemas, migrations, seeds, or database commands during M0-A.
- Do not add M1 content management, practice, tryout, analytics, payment, parent dashboard, AI, teacher, or school features.
- The original Blueprint and engineering source documents are imported verbatim under `docs/blueprint/` and `docs/implementation/`; read `docs/README.md` and the source documents before changing scope or architecture. Do not reconstruct, summarize into replacements, or edit their substantive content.
- Follow the authority order in `docs/README.md`: Product Blueprint V1 → Implementation Specification V1 → reviewed ADRs → committed migrations → code. Supporting documents cannot override higher-authority sources.
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
