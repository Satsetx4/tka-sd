# M0-C.1a Validation Record — Build Gate Stabilization

- **Verified:** 2026-10-01 15:15 Asia/Bangkok (2026-10-01 08:15 UTC)
- **Branch:** <code>chore/m0-c1-primitives</code>
- **Starting commit:** <code>4c58a02ad9cd0ea88ff74444d6fbb70c998a465f</code>
- **OS:** Windows 10 Pro, 10.0.19045, 64-bit
- **Node.js:** <code>v24.19.0</code>
- **pnpm:** <code>11.19.0</code>
- **Next.js:** <code>16.3.7</code>
- **Tailwind CSS / PostCSS plugin:** <code>4.3.3</code> / <code>4.3.3</code>
- **Build memory option:** Process-local <code>NODE_OPTIONS=--max-old-space-size=512</code>

## Failure reproduced

The default <code>pnpm build</code> ran Next.js 16.3.7 with Turbopack and repeatedly failed while processing <code>src/app/globals.css</code>. The PostCSS loader's Node subprocess exited with <code>0xc0000409</code>; Turbopack then reported that its IPC connection closed. The failure remained after <code>pnpm install</code> confirmed dependencies were already up to date.

## Diagnosis and evidence

**Best-supported diagnosis:** Tailwind CSS v4 automatic source detection was rooted at the repository working directory, although the app's Tailwind classes live under <code>src/</code>. The original checkout also contained an untracked local validation snapshot at <code>.m0a-validation/</code> (21,652 files, about 458 MB, including a nested build and dependency tree). The Windows PostCSS child process crashed during that build. This is the best-supported explanation for why the original checkout failed while clean builds passed; Windows did not identify a Node faulting module, so the exact native crash site is not available.

The diagnosis was tested against these alternatives:

- A fresh worktree at the same source commit, using the same Node.js, pnpm, and locked package versions, passed the default Turbopack build twice.
- Replaying the local <code>DATABASE_URL</code> into the fresh worktree did not reproduce the failure. Its value was not printed or recorded.
- Replaying the original <code>.next/cache</code> alone into a fresh worktree did not reproduce the failure.
- Copying the validation snapshot's <code>src/</code>, docs, and <code>.next/</code> into a fresh worktree also did not reproduce the failure.
- The lockfile and installed Next.js/Tailwind package versions matched between worktrees. Reinstalling in the original checkout did not resolve the crash.
- A diagnostic <code>--webpack</code> build is not viable at this repository path: Webpack rejects the <code>!</code> in <code>D:/!AGY</code> during configuration validation.

One build without an explicit source scope passed after a successful build had warmed the Turbopack cache; it was not counted toward the final gate. The final explicit source scope below was rebuilt and passed twice consecutively.

## Fix

Tailwind source detection is now explicit in <code>src/app/globals.css</code>:

~~~css
@import "tailwindcss" source(none);
@source "../";
~~~

This disables project-wide automatic detection and registers <code>src/</code>, relative to the stylesheet. The tracked app's Tailwind class usage is within <code>src/</code>. The syntax is supported by the [Tailwind CSS source detection documentation](https://tailwindcss.com/docs/detecting-classes-in-source-files).

## Validation matrix

| Command | Result | Evidence |
|---|---|---|
| <code>pnpm install</code> | PASS | Lockfile already up to date; pnpm 11.19.0. |
| <code>pnpm lint</code> | PASS | ESLint completed with exit code 0. |
| <code>pnpm typecheck</code> | PASS | <code>tsc --noEmit</code> completed with exit code 0. |
| <code>pnpm build</code> #1 | PASS | Turbopack compiled CSS, completed TypeScript, generated static pages, and emitted route summary; exit code 0. |
| <code>pnpm build</code> #2, consecutive | PASS | Same production build completed; exit code 0. |

## Migration and scope integrity

- <code>drizzle/0000_extensions_and_primitives.sql</code> and Drizzle metadata/schema files have no diff from the starting M0-C.1 commit.
- No migration was run; no database was changed. Production was not accessed.
- No <code>0001_identity</code> or <code>0002_taxonomy</code> work, domain tables, authentication, or product features were added.
- The intended tracked change is limited to <code>src/app/globals.css</code> and this validation record.
- Pre-existing untracked local files/directories (<code>.m0a-validation/</code>, <code>CLAUDE.md</code>, and <code>docs/adr/</code>) were preserved and not staged.

## Blockers

No local build gate blockers remain. The exact faulting native module behind the original Windows <code>0xc0000409</code> was not reported by the child process; the diagnosis above is based on the controlled build comparisons and the stable source-scope fix.
