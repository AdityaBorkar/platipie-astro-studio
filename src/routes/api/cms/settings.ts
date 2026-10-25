import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, readJson } from "#cms/api-helpers.ts";
import { envStatus } from "#cms/config.ts";
import {
	parseSettingsValues,
	patchSettingsValues,
	readSettingsRaw,
	writeSettingsRaw,
} from "#cms/settings.ts";

export const Route = createFileRoute("/api/cms/settings")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const [{ raw, mtime }, env] = await Promise.all([
						readSettingsRaw(),
						Promise.resolve(envStatus()),
					]);
					return ok({ env, mtime, raw, values: parseSettingsValues(raw) });
				} catch (e) {
					return fail(e);
				}
			},
			PUT: async ({ request }) => {
				try {
					const body = await readJson<{
						raw?: string;
						values?: Record<string, unknown>;
						mtime: number;
						force?: boolean;
					}>(request);
					if (body.raw !== undefined) {
						const res = await writeSettingsRaw(body.raw, body.mtime, { force: body.force });
						return ok({ ...res, raw: body.raw, values: parseSettingsValues(body.raw) });
					}
					if (body.values) {
						const res = await patchSettingsValues(body.values, body.mtime, { force: body.force });
						return ok(res);
					}
					return ok({ code: "VALIDATION", message: "raw or values required" }, 400);
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
