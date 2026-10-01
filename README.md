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

The source documents have been imported into this repository:

- [Product Blueprint V1.0](docs/blueprint/TKA_SD_Blueprint_Source_of_Truth_v1.0.md)
- [Implementation Specification V1.0](docs/implementation/00_Implementation_Specification_V1.0.md)
- [Taxonomy Seed Specification V1.0](docs/implementation/01_TKA_Taxonomy_Seed_V1.0.md)
- [Taxonomy Seed JSON V1.0](docs/implementation/01_taxonomy_seed_v1.json)
- [Database ERD and Schema V1.0](docs/implementation/02_Database_ERD_and_Schema_V1.0.md)
- [Database Migration Plan V1.0](docs/implementation/03_Database_Migration_Plan_V1.0.md)
- [M0 Foundation Backlog V1.0](docs/implementation/04_M0_Foundation_Backlog_V1.0.md)

See [docs/README.md](docs/README.md) for the document register and authority map.

## Scope

Keep changes within the explicitly authorized checkpoint. M0-A.2 is limited to correcting this README and recording M0-A validation results. Database integration, schemas, migrations, authentication, and M1 features remain out of scope until separately authorized.
