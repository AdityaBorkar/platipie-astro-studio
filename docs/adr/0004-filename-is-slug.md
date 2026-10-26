# Filename-is-slug with virtual slug

For projects and blog the filename stem is the slug and route. `slug` is stripped before persistence; changing it requires a rename operation that warns about stale links.

## Considered Options

- Store slug in frontmatter and sync on save.
- Implicit rename inside save when slug changes.
- Content-addressed IDs decoupled from filenames.

## Consequences

Save silently ignores slug drift by design; persisting `slug` would fork identity. Duplicate names get `-copy` suffixes, not slug deduping.
