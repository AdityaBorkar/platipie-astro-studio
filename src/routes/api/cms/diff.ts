import { promises as fs } from "node:fs";

import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam } from "#cms/api-helpers.ts";
import { resolveRepoPath } from "#cms/config.ts";
import { CmsError } from "#cms/errors.ts";
import { unifiedDiff } from "#cms/save.ts";

export const Route = createFileRoute("/api/cms/diff")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const p = queryParam(request, "path");
					const rev = queryParam(request, "rev") ?? "bak";
					if (!p) return ok({ code: "VALIDATION", message: "path required" }, 400);
					const abs = resolveRepoPath(p);
					const cur = await fs.readFile(abs, "utf8").catch(() => {
						throw new CmsError("NOT_FOUND", `Not found: ${p}`, { status: 404 });
					});
					const bakPath = rev === "bak" ? `${abs}.bak` : `${abs}.bak.${rev}`;
					const old = await fs.readFile(bakPath, "utf8").catch(() => "");
					if (!old) return ok({ diff: "", note: "No backup revision found", path: p });
					return ok({ diff: unifiedDiff(old, cur, p), path: p });
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
