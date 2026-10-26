# Media upload policy: 10 MB image-only with namespaced rename

Uploads reject over 10 MB and non-image MIME, sanitize to lowercased slugs, and namespace by date plus entry slug. Listing merges `assets/images`, `assets`, and `public` with path dedup for stable keys.

## Considered Options

- Preserve uploader filenames and paths.
- Generic file uploads for PDF or video.
- Content-hash naming.
- Store outside the project with CDN URLs.

## Consequences

`dest:public` skips date and slug prefixing while `dest:assets` does not. The `.ico` extension carve-out passes extension but fails MIME, which surprises uploaders.
