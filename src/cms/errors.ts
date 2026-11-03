export type CmsErrorCode =
	| "VALIDATION"
	| "NOT_FOUND"
	| "CONFLICT"
	| "SCHEMA_MERGE"
	| "IO"
	| "AI_DISABLED";

const STATUS: Record<CmsErrorCode, number> = {
	AI_DISABLED: 400,
	CONFLICT: 409,
	IO: 500,
	NOT_FOUND: 404,
	SCHEMA_MERGE: 500,
	VALIDATION: 400,
};

export class CmsError extends Error {
	code: CmsErrorCode;
	status: number;
	fields?: Record<string, string>;
	diff?: string;
	constructor(
		code: CmsErrorCode,
		message: string,
		opts?: { status?: number; fields?: Record<string, string>; diff?: string },
	) {
		super(message);
		this.code = code;
		this.status = opts?.status ?? STATUS[code];
		this.fields = opts?.fields;
		this.diff = opts?.diff;
	}
}

export function cmsError(
	code: CmsErrorCode,
	message: string,
	status?: number,
	fields?: Record<string, string>,
): CmsError {
	return new CmsError(code, message, { fields, status });
}

export function toErrorPayload(e: unknown): {
	code: CmsErrorCode;
	message: string;
	fields?: Record<string, string>;
	diff?: string;
	status: number;
} {
	if (e instanceof CmsError) {
		return { code: e.code, diff: e.diff, fields: e.fields, message: e.message, status: e.status };
	}
	const message = e instanceof Error ? e.message : String(e);
	if ((e as { code?: string })?.code === "ENOENT") {
		return { code: "NOT_FOUND", message, status: 404 };
	}
	return { code: "IO", message, status: 500 };
}

/** Redact secrets so error messages never leak the AI key or tokens. */
export function sanitizeErrorMessage(message: string): string {
	return message
		.replaceAll(/sk-[A-Za-z0-9-_]+/gu, "[redacted]")
		.replaceAll(/("?authorization"?\s*[:=]\s*)(bearer\s+)?[^\s",;]+/giu, "$1[redacted]")
		.replaceAll(
			/["']?(api[_-]?key|access[_-]?token|secret)["']?\s*[:=]\s*["']?[^"',\s;}]+["']?/giu,
			"[redacted]",
		);
}

export function jsonError(e: unknown): Response {
	const p = toErrorPayload(e);
	const safe = sanitizeErrorMessage(p.message);
	return Response.json(
		{ code: p.code, diff: p.diff, fields: p.fields, message: safe },
		{ status: p.status },
	);
}
