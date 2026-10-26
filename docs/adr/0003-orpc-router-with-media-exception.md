# oRPC router owns JSON; media stays a file route

All JSON procedures live in one `cmsRouter` with legacy REST shapes served via OpenAPI and typed RPC. Only media stays a plain file route because binary streaming and multipart upload are not JSON procedures.

## Considered Options

- One file route per endpoint.
- Pure RPC without REST-shaped OpenAPI.
- Force media through oRPC with base64.

## Consequences

New JSON endpoints go in the router, not `src/routes/api`. The media exception is deliberate, not inconsistency to refactor away.
