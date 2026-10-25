import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam, readJson } from "#cms/api-helpers.ts";
import { CmsError } from "#cms/errors.ts";
import { loadEntry, saveEntry, softDelete, type EntryPayload, type EntryRef } from "#cms/save.ts";

export const Route = createFileRoute("/api/cms/entry")({
	server: {
		handlers: {
			DELETE: async ({ request }) => {
				try {
					const body = await readJson<{ path?: string; rowId?: string }>(request).catch(
						() => ({}) as { path?: string; rowId?: string },
					);
					const qPath = body.path ?? queryParam(request, "path");
					if (!qPath) return ok({ code: "VALIDATION", message: "path required" }, 400);
					const res = await softDelete(qPath, body.rowId);
					return ok(res);
				} catch (e) {
					return fail(e);
				}
			},
			GET: async ({ request }) => {
				try {
					const p = queryParam(request, "path");
					if (!p) return ok({ code: "VALIDATION", message: "path required" }, 400);
					const entry = await loadEntry(p);
					return ok(entry);
				} catch (e) {
					return fail(e);
				}
			},
			PUT: async ({ request }) => {
				try {
					const body = await readJson<{ ref: EntryRef; payload: EntryPayload; force?: boolean }>(
						request,
					);
					if (!body.ref?.path || !body.payload) {
						throw new CmsError("VALIDATION", "ref.path + payload required", { status: 400 });
					}
					const res = await saveEntry(body.ref, body.payload, { force: body.force });
					return ok(res);
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
