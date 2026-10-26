# Soft-delete to .cms-trash with lazy TTL

Deletes never unlink: files move under `.cms-trash/<timestamp>/<rel>` with a manifest, JSON rows move as envelopes holding the removed row. Expiry is lazy on trash list with a 30-day default, and restore enforces TTL plus collisions.

## Considered Options

- Hard `rm`.
- Git-based revert.
- Trash flag column in SQLite.
- Synchronous TTL sweeper or cron.

## Consequences

Trash lives inside the jail and shows in git status; the watcher must keep ignoring it. File restore and row re-append have different conflict semantics.
