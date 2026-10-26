// `media.ts` stays separate: binary streaming + multipart upload are not JSON procedures.
import { createFileRoute } from "@tanstack/react-router";

import { cmsOpenAPIHandler, contextForRequest } from "#/cms/orpc/handler.ts";

export const Route = createFileRoute("/api/cms/$")({
	server: {
		handlers: {
			ANY: async ({ request }) => {
				const { matched, response } = await cmsOpenAPIHandler.handle(request, {
					context: contextForRequest(request),
					prefix: "/api/cms",
				});
				if (matched) return response;
				return Response.json({ code: "NOT_FOUND", message: "Not found" }, { status: 404 });
			},
		},
	},
});
