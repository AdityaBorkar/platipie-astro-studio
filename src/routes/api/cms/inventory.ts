import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam } from "#cms/api-helpers.ts";
import { SYNC_SCOPES, getInventory, getSyncStatus } from "#cms/sync/index.ts";
import type { SyncScope } from "#cms/sync/index.ts";

export const Route = createFileRoute("/api/cms/inventory")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const scopeParam = queryParam(request, "scope");
					const status = await getSyncStatus();
					const scopes = (scopeParam ?? "all")
						.split(",")
						.map((entry) => entry.trim())
						.filter(Boolean);
					if (scopes.includes("all")) {
						const entries = await Promise.all(
							SYNC_SCOPES.map(async (entry) => [entry, await getInventory(entry)] as const),
						);
						const rows = Object.fromEntries(entries) as Record<
							SyncScope,
							Record<string, unknown>[]
						>;
						return ok({ rows, scope: "all", status });
					}
					for (const scope of scopes) {
						if (!(SYNC_SCOPES as readonly string[]).includes(scope)) {
							return ok({ code: "VALIDATION", message: `Unknown scope: ${scope}` }, 400);
						}
					}
					if (scopes.length === 1) {
						const scope = scopes[0] as SyncScope;
						return ok({ rows: await getInventory(scope), scope, status });
					}
					const entries = await Promise.all(
						scopes.map(async (scope) => [scope, await getInventory(scope as SyncScope)] as const),
					);
					const rows = Object.fromEntries(entries) as Record<string, Record<string, unknown>[]>;
					return ok({ rows, scope: scopes.join(","), status });
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
