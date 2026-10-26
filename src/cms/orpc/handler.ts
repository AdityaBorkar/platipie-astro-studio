// Error bodies keep the legacy shape so existing `fetchJson` callers keep working.
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { ORPCError } from "@orpc/server";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { clientIp } from "../api-helpers.ts";
import { ensureServerSync } from "../sync/engine.ts";
import type { CmsContext } from "./base.ts";
import { cmsRouter } from "./router.ts";

export function contextForRequest(request: Request): CmsContext {
	const ip = clientIp(request);
	const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	// First API call lazily boots the watcher (deduped, backgrounded).
	ensureServerSync();
	return { ip, requestId };
}

function encodeCmsError(error: ORPCError<string, unknown>): unknown {
	const data = (error.data ?? {}) as {
		diff?: unknown;
		fields?: unknown;
		issues?: { message?: unknown; path?: unknown }[];
	};
	// Legacy contract uses VALIDATION + fields map, not BAD_REQUEST + issues.
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

export const cmsOpenAPIHandler = new OpenAPIHandler(cmsRouter, {
	customErrorResponseBodyEncoder: encodeCmsError,
	interceptors: [onError(logError)],
});

export const cmsRPCHandler = new RPCHandler(cmsRouter, {
	interceptors: [onError(logError)],
});
