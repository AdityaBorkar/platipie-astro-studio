# SQLite is a derived read-model; files are the source of truth

All inventory UI renders from SQLite, but every write goes straight to disk and the DB is rebuilt by scanner plus watcher. Deleting the DB file is safe; staleness comes from watcher lag, not data loss.

## Considered Options

- Walk the filesystem per request with no DB.
- Make SQLite canonical with export-to-disk.
- Per-scope JSON caches on disk.

## Consequences

Debugging starts at `PROJECT_PATH` files, never at `cms.db`. Sync scope reruns are the fix for stale UI, not DB migrations.
