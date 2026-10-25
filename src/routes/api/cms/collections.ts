import { createFileRoute } from "@tanstack/react-router";

import { fail, ok } from "#cms/api-helpers.ts";
import { collectionCounts, COLLECTIONS, driftWarnings, recentEdits } from "#cms/collections.ts";
import { envStatus } from "#cms/config.ts";

export const Route = createFileRoute("/api/cms/collections")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const [counts, drift, recent, env] = await Promise.all([
						collectionCounts(),
						driftWarnings(),
						recentEdits(20),
						Promise.resolve(envStatus()),
					]);
					const collections = await Promise.all(
						COLLECTIONS.map((c) =>
							Object.assign({}, c, {
								count: counts[c.id] ?? 0,
								entries: undefined,
							}),
						),
					);
					return ok({ collections, counts, drift, env, recent });
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
