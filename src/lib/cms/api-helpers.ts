// Shared API helpers (server-only).
import { jsonError } from "#cms/errors.ts";

export function ok(data: unknown, status = 200): Response {
	return Response.json(data, { status });
}

export function fail(e: unknown): Response {
	return jsonError(e);
}

/**
 * Legacy JSON body reader. Unused since the oRPC migration (zod input
 * schemas in `orpc/schemas.ts` replaced the ad-hoc casts); kept for compat.
 * Empty bodies resolve to `{}` for legacy callers; invalid JSON rejects via
 * `JSON.parse` (callers must handle the throw).
 */
export async function readJson<T>(request: Request): Promise<T> {
	const text = await request.text();
	if (!text) return {} as T;
	return JSON.parse(text) as T;
}

export function queryParam(request: Request, key: string): string | null {
	return new URL(request.url).searchParams.get(key);
}

export function clientIp(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"127.0.0.1"
	);
}
