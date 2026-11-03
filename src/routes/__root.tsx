import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { AppSidebar } from "#/components/gitbook/app-sidebar";
import { ErrorPage } from "#/components/pages/error";
import { LoadingPage } from "#/components/pages/loading";
import { NotFoundPage } from "#/components/pages/not-found";
import { Toaster } from "#/components/ui/sonner";
import { env } from "#/env";
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
			{ title: env.VITE_APP_TITLE ?? "platipie-cms" },
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

// React Grab: dev-only lazy browser load for copying element source context.
function ReactGrabDevtools() {
	useEffect(() => {
		void import("react-grab");
	}, []);
	return null;
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script suppressHydrationWarning>{themeScript}</script>
			</head>
			<body className="min-h-dvh">
				<a
					className="fixed top-3 left-3 z-50 -translate-y-16 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
					href="#main"
				>
					Skip to content
				</a>
				<div className="min-h-dvh">
					<AppSidebar />
					<div className="lg:pl-sidebar">
						<main className="min-h-dvh pt-12 lg:pt-0" id="main">
							{children}
						</main>
					</div>
				</div>
				<Toaster position="top-center" richColors />
				{import.meta.env.DEV ? <ReactGrabDevtools /> : null}
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
