# AI is strictly opt-in BYOK with local-first heuristics

AI requires both `AI_API_KEY` and `AI_BASE_URL`; setting only one silently keeps it off and the key never leaves the server. Without it, heuristic SEO scoring still works and AI suggest throws `AI_DISABLED`.

## Considered Options

- Bundled or vendor API key.
- Single-env enable.
- Client-side AI calls.
- Persistent or distributed rate limiting.

## Consequences

Transport-level rate limiting only covers the oRPC path, not direct library calls. Prompt parsing tolerates non-compliant models by design.
