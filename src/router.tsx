import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { ErrorPage } from "#/components/pages/error";
import { LoadingPage } from "#/components/pages/loading";
import { NotFoundPage } from "#/components/pages/not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		defaultErrorComponent: ErrorPage,
		defaultNotFoundComponent: NotFoundPage,
		defaultPendingComponent: LoadingPage,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		routeTree,
		scrollRestoration: true,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
