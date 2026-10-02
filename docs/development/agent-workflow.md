# Multi-agent Workflow

## Roles and authority

- ChatGPT Chat coordinates the requested checkpoint and independently audits the completed handoff.
- Codex is the lead engineer and sole integration authority. It owns repository synchronization, scope review, integration, and authoritative final gates.
- Antigravity CLI sub-agents handle only small tasks explicitly delegated by Codex. A task may be read-only or allow edits to named files. Each task states its acceptance criteria, permitted tools, and stop boundary.
- All agents follow the same repository guardrails and source-of-truth order. Agent reports do not become decisions until Codex verifies them against those sources.

## Checkpoint workflow

1. Read docs/README.md, applicable source documents, the current task contract, and the latest relevant docs/validation/ record.
2. Verify the repository, origin, branch, and working tree. Preserve existing work and synchronize only by fetch plus fast-forward.
3. Define the files, acceptance criteria, validation gates, and stop boundary before delegating.
4. Delegate isolated tasks with disjoint file ownership. Use separate worktrees when they are available and suitable; otherwise assign files so agents do not edit the same paths concurrently.
5. Review each report and diff against the task contract and authoritative documents. Accept, revise, or reject findings explicitly; do not copy agent output blindly.
6. Codex performs the final integration and runs the checkpoint's authoritative gates. Record the evidence in docs/validation/<checkpoint>-validation.md.
7. Deliver the scoped branch or authorized integration to GitHub, then hand the checkpoint to ChatGPT Chat for an independent audit. Stop before the next checkpoint.

The normal handoff is:

ChatGPT Chat (orchestrator/controller)
→ Codex (lead/integrator)
→ Antigravity CLI sub-agents
→ Codex review, integration, and authoritative gates
→ GitHub
→ ChatGPT independent audit

## File ownership and Git

- Codex assigns each sub-agent only the files and actions stated in its task. Read-only tasks must not edit files, commit, push, or change configuration.
- Avoid overlapping file ownership. If a shared file must change, one agent proposes and Codex makes or reviews the integration.
- Codex owns staging, checkpoint commits, and GitHub integration unless the user explicitly assigns a different operation.
- Antigravity must not push or merge to main. It must not stage or commit files outside its explicit delegation.
- Never use destructive synchronization, silent stashing, force pushes, or history rewriting. Stop and report if the worktree is dirty in a way that blocks the planned safe sync.

## Evidence and reporting

A checkpoint validation record should identify the Codex lead role, delegated Antigravity task and exact safe command, high-level result and files affected, findings accepted/rejected/reworked, Codex's integration decisions, authoritative gate results, base SHA, branch, remote GitHub state, and the stop boundary. Report the resulting delivery commit SHA in the task handoff. State clearly when a database or production environment was not accessed.

## Failure and fallback

If Antigravity is unavailable, lacks authentication, hangs, or cannot run safely in headless mode, do not install, upgrade, log in, or reconfigure it just for a checkpoint. Record the exact attempt and outcome. When the task contract permits fallback, Codex may complete the isolated audit itself and must label the fallback in the validation record. If an external approval or missing access is required, stop that dependent action and report the blocker.
