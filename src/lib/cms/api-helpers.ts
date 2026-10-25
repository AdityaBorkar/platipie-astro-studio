// Shared API helpers (server-only).
import { jsonError } from "#cms/errors.ts";

export function ok(data: unknown, status = 200): Response {
	return Response.json(data, { status });
}

export function fail(e: unknown): Response {
	return jsonError(e);
}

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
