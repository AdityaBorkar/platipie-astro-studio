import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import { AppSidebar } from "#/components/gitbook/app-sidebar";
import { ErrorPage } from "#/components/pages/error";
import { LoadingPage } from "#/components/pages/loading";
import { NotFoundPage } from "#/components/pages/not-found";
import { Toaster } from "#/components/ui/sonner";
import { themeScript } from "#/hooks/use-theme";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	errorComponent: ErrorPage,
	head: () => ({
		links: [
			{
				href: appCss,
				rel: "stylesheet",
			},
			{
				as: "font",
				crossOrigin: "anonymous",
				href: "/fonts/general-sans/general-sans-400.woff2",
				rel: "preload",
				type: "font/woff2",
			},
			{
				as: "font",
				crossOrigin: "anonymous",
				href: "/fonts/general-sans/general-sans-700.woff2",
				rel: "preload",
				type: "font/woff2",
			},
			{
				href: "/favicon.svg",
				rel: "icon",
				type: "image/svg+xml",
			},
			{
				href: "/favicon.ico",
				rel: "alternate icon",
			},
			{
				href: "/icon.png",
				rel: "apple-touch-icon",
			},
		],
		meta: [
			{ charSet: "utf-8" },
			{ content: "width=device-width, initial-scale=1", name: "viewport" },
			{ title: "platipie-cms" },
			{
				content:
					"Standalone content-management server for the Astro site. Files are the source of truth; SQLite holds a synced read-model.",
				name: "description",
			},
		],
	}),
	notFoundComponent: NotFoundPage,
	pendingComponent: LoadingPage,
	shellComponent: RootDocument,
});

/**
 * React Grab — hover any element and press Cmd/Ctrl+C to copy its source
 * context for AI agents. Loaded lazily, in the browser, in development only.
 */
function ReactGrabDevtools() {
	useEffect(() => {
		if (import.meta.env.DEV) {
			void import("react-grab");
		}
	}, []);
	return null;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script suppressHydrationWarning>{themeScript}</script>
			</head>
			<body className="min-h-dvh">
				<div className="min-h-dvh">
					<AppSidebar />
					<div className="lg:pl-sidebar">
						<main className="min-h-dvh pt-12 lg:pt-0">{children}</main>
					</div>
				</div>
				<Toaster position="top-center" richColors />
				<ReactGrabDevtools />
				<TanStackDevtools
					config={{
						position: "bottom-left",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
