import { createFileRoute } from "@tanstack/react-router";

import { cmsRPCHandler, contextForRequest } from "#/cms/orpc/handler.ts";

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			ANY: async ({ request }) => {
				const { response } = await cmsRPCHandler.handle(request, {
					context: contextForRequest(request),
					prefix: "/api/rpc",
				});
				return (
					response ?? Response.json({ code: "NOT_FOUND", message: "Not found" }, { status: 404 })
				);
			},
		},
	},
});
