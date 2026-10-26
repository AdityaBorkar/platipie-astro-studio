// oRPC base: shared context, middlewares, and procedure bases for the CMS API.
// Every procedure gets request logging + CMS error mapping; AI procedures add
// per-IP rate limiting (moved here from the SEO service so it applies once,
// at the transport edge).
import { ORPCError, os } from "@orpc/server";

import { sanitizeErrorMessage, toErrorPayload } from "#cms/errors.ts";

export interface CmsContext {
	ip: string;
	requestId: string;
}

const cmsBase = os.$context<CmsContext>();

/** Map any thrown value (CmsError, ENOENT, unknown) to a typed ORPCError. */
export function toORPCError(e: unknown): ORPCError<string, unknown> {
	if (e instanceof ORPCError) return e;
	const payload = toErrorPayload(e);
	const data: Record<string, unknown> = {};
	if (payload.diff !== undefined) data.diff = payload.diff;
	if (payload.fields !== undefined) data.fields = payload.fields;
	return new ORPCError(payload.code, {
		data,
		message: sanitizeErrorMessage(payload.message),
		status: payload.status,
	});
}

/** Timing/access log for every procedure call. */
export const requestLogMiddleware = cmsBase.middleware(async ({ context, next, path }) => {
	const start = Date.now();
	try {
		return await next();
	} finally {
		console.debug(`[orpc] ${context.requestId} ${path.join("/")} ${Date.now() - start}ms`);
	}
});

/** Converts service-layer throws into transport-safe ORPCErrors. */
export const cmsErrorMiddleware = cmsBase.middleware(async ({ next }) => {
	try {
		return await next();
	} catch (e: unknown) {
		throw toORPCError(e);
	}
});

const aiBucket = new Map<string, { count: number; resetAt: number }>();
const AI_RATE_LIMIT = 10;
const AI_WINDOW_MS = 60_000;

/** 10 req/min per IP for BYOK AI procedures (429 when exhausted). */
export const aiRateLimitMiddleware = cmsBase.middleware(({ context, next }) => {
	const now = Date.now();
	// Sweep expired entries when the bucket grows unboundedly (long-lived
	// server would otherwise leak one entry per distinct IP forever).
	if (aiBucket.size > 500) {
		for (const [ip, entry] of aiBucket) {
			if (now > entry.resetAt) aiBucket.delete(ip);
		}
	}
	const current = aiBucket.get(context.ip);
	if (!current || now > current.resetAt) {
		aiBucket.set(context.ip, { count: 1, resetAt: now + AI_WINDOW_MS });
	} else {
		if (current.count >= AI_RATE_LIMIT) {
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message: "AI rate limit exceeded (10/min) — try again shortly",
			});
		}
		current.count += 1;
	}
	return next();
});

/** Default base: logging + CMS error mapping. */
export const base = cmsBase.use(requestLogMiddleware).use(cmsErrorMiddleware);

/** AI base: default middlewares + per-IP rate limiting. */
export const aiBase = base.use(aiRateLimitMiddleware);
