import { createFileRoute } from "@tanstack/react-router";

import { fail, ok, queryParam, readJson } from "#cms/api-helpers.ts";
import { listProjects, selectProject } from "#cms/projects.ts";

export const Route = createFileRoute("/api/cms/projects")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const q = (queryParam(request, "q") ?? "").toLowerCase();
					let projects = await listProjects();
					if (q) {
						projects = projects.filter(
							(project) =>
								project.name.toLowerCase().includes(q) ||
								project.displayPath.toLowerCase().includes(q) ||
								project.branch.toLowerCase().includes(q),
						);
					}
					return ok({ projects });
				} catch (e) {
					return fail(e);
				}
			},
			POST: async ({ request }) => {
				try {
					const body = await readJson<{ root?: string }>(request);
					if (!body.root) return ok({ code: "VALIDATION", message: "root required" }, 400);
					return ok({ workspace: await selectProject(body.root) });
				} catch (e) {
					return fail(e);
				}
			},
		},
	},
});
