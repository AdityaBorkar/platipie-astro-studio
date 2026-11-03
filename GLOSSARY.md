# platipie-astro-studio

Standalone content-management server for an Astro site. Files under the project root stay the source of truth; the CMS reads and writes them directly.

## Language

### Project and sync

**Project root**:
A checkout under management. Server-only; never sent to the client.
_Avoid_: Workspace, Project entry

**Workspace**:
Identity and inventory snapshot derived from the project root: name, branch, pages, reachability.
_Avoid_: Project root, Project entry

**Project selector**:
Flow that discovers Astro checkouts and repoints the server at a different root.
_Avoid_: Workspace switcher, project switcher

**Project entry**:
One discoverable Astro checkout listed by the selector.
_Avoid_: Workspace, Project root

**Sync read-model**:
Derived SQLite mirror of the checkout that powers inventory UI. Files stay the source of truth.
_Avoid_: Source of truth, cache

### Content model

**Collection**:
A named content set managed by the CMS. The seven are projects, blog, clients, mockups, testimonials, legal, and settings.
_Avoid_: Table, loader, folder

**Content schema**:
Zod model that validates a collection.
_Avoid_: Sync schema, Schema.org markup

**Schema.org markup**:
Structured-data type and fields attached to an entry for SEO.
_Avoid_: Content schema, sync tables

**Status**:
Lifecycle state of an entry: draft, published, or scheduled. Filtering and scheduling live in the Astro site, not the CMS.
_Avoid_: Visibility, published flag

**Filename-is-slug**:
Rule that the file stem is the entry slug. Editing slug renames the file; slug is never stored in frontmatter.
_Avoid_: Slug field, redirect

**Schema extension**:
Additive, optional-only widening of the upstream content model so parity fields validate. Never narrows existing rules.
_Avoid_: Migration, narrowing, rewrite

**WordPress-parity set**:
Canonical publishing and SEO fields the CMS guarantees: slug, excerpt, status, dates, author, taxonomy, images, canonical, SEO, and noindex/nofollow.
_Avoid_: Frontmatter dump, schema

**Drift**:
Content or reality differing from the registered model, surfaced never silently dropped. Current codes are testimonials-project-drift, template-oddity, and blog-route-missing.
_Avoid_: Error, validation failure

### Editing

**Unified editor**:
Single editing screen for markdown entries sharing one save pipeline across source, form, previews, and SEO. JSON collections use a table editor instead.
_Avoid_: Visual mode, settings form

**Visual mode**:
Local TipTap editing styled like the site. MDX constructs render as opaque placeholders.
_Avoid_: Milkdown, Faithful preview

**Local preview**:
Offline HTML render of the entry produced inside the CMS. Always available.
_Avoid_: Faithful preview

**Faithful preview**:
Read-only iframe rendering the entry from the running Astro site. Blog maps to blog/<slug>, projects to work/<slug>, everything else to legal; absent when ASTRO_URL is unset.
_Avoid_: Local preview

### Safety and media

**Trash**:
Soft-delete area retaining files and JSON row envelopes until TTL expiry. Expiry is lazy on list, not scheduled.
_Avoid_: Hard delete, Backup

**Backup**:
Rotated .bak copy written before every file mutation, kept alongside the original.
_Avoid_: Trash, git revert, versioning

**Large-file guard**:
One-megabyte threshold above which entries open read-only unless forced.
_Avoid_: Upload cap, validation error

**Media library**:
Managed images under assets and public. Uploads are capped at 10 MB and limited to images.
_Avoid_: File browser, CDN

### App shell

**App rail**:
Fixed left navigation showing workspace identity, nav map, and sync state. It becomes a drawer below lg.
_Avoid_: Top nav

**Page inventory**:
Routable files under src/pages marked static, dynamic, or utility. Covers astro, md, mdx plus utility-only js/ts endpoints; private _ files are excluded.
_Avoid_: Sitemap, Collection
