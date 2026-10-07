<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository-wide constraints

### Source of truth

- Read docs/README.md before architecture-sensitive work, then read every applicable Blueprint, Implementation Specification, and reviewed ADR.
- Preserve this authority order: Product Blueprint > Implementation Specification > reviewed ADRs > committed migrations > application code. Supporting documents, task prompts, and agent reports cannot override higher-authority sources.
- If authoritative sources conflict materially, stop the affected work and identify the conflict before implementing a behavior or schema decision.
- Original source documents under docs/blueprint/ and docs/implementation/ are reference baselines. Implementation tasks must not substantively rewrite them.

### Git and worktree safety

- Use pnpm for package and script operations.
- Inspect Git status before changing files and preserve unrelated tracked and untracked local work.
- Do not use reset --hard, clean, destructive checkout, force push, history rewriting, or silent auto-stash.
- Safe synchronization uses fetch followed by fast-forward only. If tracked changes block synchronization or branches have diverged, stop and report the state.
- Keep staging and commits within the active checkpoint. Stage only reviewed files belonging to that checkpoint.

### Database and secrets

- Use development or preview databases unless the active task explicitly authorizes another environment. Production databases are read-only by default; do not migrate or write to production without explicit user authorization.
- Do not use drizzle push. Apply database changes through reviewed migrations.
- Treat committed or applied historical migrations as immutable unless a separately approved recovery plan authorizes a repair.
- Never commit or log credentials, tokens, connection strings, or populated environment files. Keep secrets server-side.

### Checkpoint scope

- Follow the explicit contract for the active checkpoint, including allowed files, required gates, and stop boundary. The task contract defines work scope but does not override source-of-truth documents.
- Do not start a later checkpoint or implement adjacent features automatically.
- Stop at the stated checkpoint boundary and leave the result ready for independent audit.

### Engineering defaults

- Use TypeScript strict mode and React Server Components by default. Add client components only when browser interaction requires them.
- Keep database access and domain logic server-side.
- Do not hardcode learner names, scores, grades, completion results, or private user state.
- Keep answer keys and explanations out of browser responses until the authoritative product contract allows their disclosure at the relevant evaluation boundary.

### Testing and validation

- Run the validation gates specified by the active checkpoint.
- When code changes, run lint, typecheck, and build at minimum unless the checkpoint explicitly sets a narrower gate.
- Use existing test tooling; do not add dependencies unless the active task authorizes them.
- Record validation evidence for architecture-sensitive checkpoints under docs/validation/.

### Multi-agent hierarchy

- ChatGPT Chat is the orchestrator/controller and performs an independent audit after checkpoint delivery.
- Codex is the lead and integrator. Use native Codex sub-agents only for explicitly delegated bounded tasks.
- Do not use Antigravity CLI or agy. This repository-specific rule overrides any broader tool allowance in supporting workflow or validation documents.
- Give each delegated task clear acceptance criteria and non-overlapping file ownership. Treat agent output as advisory until Codex reviews it.
- Codex reviews every delegated result and runs the authoritative final gates.
- Follow docs/development/agent-workflow.md for the delegation and handoff process, subject to this repository's tooling rule.

### Roadmap execution

- Before starting new project work, read docs/roadmap/V1_MASTER_EXECUTION_PLAN.md and docs/roadmap/V1_EXECUTION_STATUS.md after the authority documents.
- The roadmap defines execution sequence and status but does not override the Blueprint, Implementation Specification, or reviewed ADRs.
