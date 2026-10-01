# TKA SD

Repository foundation for TKA SD. This checkpoint covers the application shell and developer tooling only; product features and database work are outside M0-A.

## Stack

- Next.js App Router
- TypeScript strict mode
- React and Tailwind CSS
- pnpm

## Local setup

Requirements: Node.js 20.9 or newer and pnpm 11.19.x.

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

M0-A does not require environment variables. Keep `.env.local` private and never commit credentials.

## Main commands

```text
pnpm dev        Start the local development server
pnpm lint       Run ESLint
pnpm typecheck  Check TypeScript types
pnpm build      Create a production build
pnpm start      Serve the production build
```

## Repository documents

See [docs/README.md](docs/README.md) for the authority order and import status of the Product Blueprint, Implementation Specification, taxonomy, ERD, migration plan, and M0 backlog. The original source artifacts were not available in this repository or in the referenced conversation attachments when M0-A was prepared; the placeholders under `docs/` are not substitutes for those documents.

## Scope

Keep this checkpoint to the application bootstrap. Do not add database integration or product features until the relevant source documents are available and the next checkpoint is explicitly authorized.
