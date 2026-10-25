import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import { ErrorPage } from "#/components/pages/error";
import { LoadingPage } from "#/components/pages/loading";
import { NotFoundPage } from "#/components/pages/not-found";
import { ThemeToggle } from "#/components/theme-toggle";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
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
				href: "/favicon.ico",
				rel: "icon",
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
					"Standalone content-management server for the Astro site at ASTRO_ROOT. No database — cms/ files are the source of truth.",
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
			<body>
				<nav className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-4 py-2">
					<strong className="text-sm font-semibold tracking-tight">platipie-cms</strong>
					<Separator className="h-4" orientation="vertical" />
					<Button nativeButton={false} render={<Link to="/" />} size="sm" variant="ghost">
						Dashboard
					</Button>
					<Button nativeButton={false} render={<Link to="/settings" />} size="sm" variant="ghost">
						Settings
					</Button>
					<Badge className="ml-auto hidden font-mono sm:inline-flex" variant="secondary">
						ASTRO_ROOT jail · localhost only · no auto-commit
					</Badge>
					<ThemeToggle />
				</nav>
				<div className="mx-auto w-full max-w-6xl p-4">{children}</div>
				<Toaster position="bottom-right" richColors />
				<ReactGrabDevtools />
				<TanStackDevtools
					config={{
						position: "bottom-right",
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
