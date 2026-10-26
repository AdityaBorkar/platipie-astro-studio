# PROJECT_PATH jail plus localhost bind is the V1 safety model

The server does arbitrary file read and write under a user-supplied root, so `resolveRepoPath` traversal rejection is the single filesystem choke point. V1 has no login; safety comes from localhost bind, pre-write backups, mtime concurrency checks, and danger-zone confirms.

## Considered Options

- Per-route allowlists instead of a single jail.
- OS sandboxing or containers.
- Password, OAuth, or token-gated API.

## Consequences

Every file op must pass through the jail; the project switcher mutating `PROJECT_PATH` is a privileged action. Adding auth later must not weaken the jail check.
