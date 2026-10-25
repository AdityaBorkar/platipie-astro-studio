import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, readJson } from "#cms/api-helpers.ts";
import { SYNC_SCOPES, fullSync, getSyncStatus, syncScope } from "#cms/sync/index.ts";
import type { SyncScope } from "#cms/sync/index.ts";

export const Route = createFileRoute("/api/cms/sync")({
	server: {
		handlers: {
			GET: async () => {
				try {
					return ok({ status: await getSyncStatus() });
				} catch (e) {
					return fail(e);
				}
			},
			POST: async ({ request }) => {
				try {
					const body = await readJson<{ scope?: string }>(request);
					if (body.scope && !(SYNC_SCOPES as readonly string[]).includes(body.scope)) {
						return ok({ code: "VALIDATION", message: `Unknown scope: ${body.scope}` }, 400);
					}
					if (body.scope) {
						const fileCount = await syncScope(body.scope as SyncScope);
						return ok({ fileCount, scope: body.scope, status: await getSyncStatus() });
					}
					const result = await fullSync();
					return ok({ ...result, status: await getSyncStatus() });
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
