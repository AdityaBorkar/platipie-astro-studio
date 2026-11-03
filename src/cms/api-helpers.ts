// Transport-agnostic request helpers. Legacy readJson/queryParam/ok/fail shims
// were removed: routes use URLSearchParams + Response.json directly.
export function clientIp(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"127.0.0.1"
	);
}
