import { Link } from "@tanstack/react-router";
import { CompassIcon, HouseIcon } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";

/** Full-screen 404 state shown for unknown routes. */
export function NotFoundPage() {
	return (
		<div className="relative flex min-h-dvh flex-col">
			<div aria-hidden="true" className="page-glow" />
			<main className="relative grid flex-1 place-items-center px-5 py-10">
				<section className="animate-rise mx-auto w-full max-w-md text-center">
					<div className="flex flex-col items-center justify-center">
						<Badge
							className="mt-4 gap-1.5 px-2 py-1 font-mono text-11 tracking-widest uppercase"
							variant="secondary"
						>
							<CompassIcon className="size-3.5" />
							404
						</Badge>
					</div>
					<h1 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h1>
					<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
						This page doesn&apos;t exist or was moved. Head back to the dashboard to keep editing.
					</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
						<Button nativeButton={false} render={<Link to="/" />} size="sm">
							<HouseIcon className="size-3.5" />
							Back to home
						</Button>
					</div>
				</section>
			</main>
		</div>
	);
}
