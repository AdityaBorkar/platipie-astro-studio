// Shared oRPC handlers: OpenAPI (REST, same `/api/cms/*` URLs) + RPC (typed client).
// Error bodies keep the legacy `{ code, message, fields?, diff? }` shape so
// existing `fetchJson` callers and error-code branches keep working.
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { ORPCError } from "@orpc/server";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { ensureServerSync } from "../sync/engine.ts";
import type { CmsContext } from "./base.ts";
import { cmsRouter } from "./router.ts";

export function contextForRequest(request: Request): CmsContext {
	const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	const ip = forwarded || request.headers.get("x-real-ip") || "127.0.0.1";
	const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	// Lazy engine start: the first API call for the open project boots its
	// watcher (deduped, backgrounded). Project switches restart it via
	// `selectProject`; shutdown hooks stop it when the server closes.
	ensureServerSync();
	return { ip, requestId };
}

function encodeCmsError(error: ORPCError<string, unknown>): unknown {
	const data = (error.data ?? {}) as {
		diff?: unknown;
		fields?: unknown;
		issues?: { message?: unknown; path?: unknown }[];
	};
	// oRPC reports input/output validation as BAD_REQUEST with `issues`; the
	// legacy contract uses `VALIDATION` with a `fields` map.
	if (error.code === "BAD_REQUEST" && Array.isArray(data.issues)) {
		const fields: Record<string, string> = {};
		for (const issue of data.issues) {
			const key = Array.isArray(issue.path) ? issue.path.map(String).join(".") || "_root" : "_root";
			if (typeof issue.message === "string" && !fields[key]) fields[key] = issue.message;
		}
		const first = data.issues.find((issue) => typeof issue.message === "string");
		const body: Record<string, unknown> = {
			code: "VALIDATION",
			message: typeof first?.message === "string" ? first.message : error.message,
		};
		if (Object.keys(fields).length > 0) body.fields = fields;
		return body;
	}
	const body: Record<string, unknown> = { code: error.code, message: error.message };
	if (data.diff !== undefined) body.diff = data.diff;
	if (data.fields !== undefined) body.fields = data.fields;
	return body;
}

function logError(error: unknown): void {
	console.error("[orpc]", error);
}

/** REST handler mounted at `/api/cms` — same method+path contract as before. */
export const cmsOpenAPIHandler = new OpenAPIHandler(cmsRouter, {
	customErrorResponseBodyEncoder: encodeCmsError,
	interceptors: [onError(logError)],
});

/** Typed RPC handler mounted at `/api/rpc` for the generated client. */
export const cmsRPCHandler = new RPCHandler(cmsRouter, {
	interceptors: [onError(logError)],
});
