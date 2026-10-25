import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, CompassIcon } from "lucide-react";

import { BrandMark } from "#/components/gitbook/brand";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";

/** Full-screen 404 state shown for unknown routes. */
export function NotFoundPage() {
	return (
		<div className="relative flex min-h-dvh flex-col">
			<div aria-hidden="true" className="page-glow" />
			<main className="relative grid flex-1 place-items-center px-5 py-10">
				<section className="animate-rise mx-auto w-full max-w-md text-center">
					<div className="relative mx-auto mb-5 flex size-20 items-center justify-center">
						<BrandMark className="absolute size-24 text-foreground/5" title="" />
						<span className="relative inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card shadow-soft">
							<CompassIcon className="size-5 text-brand" />
						</span>
					</div>
					<Badge className="font-mono" variant="brand">
						404
					</Badge>
					<h1 className="mt-3 text-2xl font-bold tracking-heading">Page not found</h1>
					<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
						This page doesn&apos;t exist or was moved. Head back to the dashboard to keep editing.
					</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
						<Button nativeButton={false} render={<Link to="/" />} size="sm">
							Back to dashboard
							<ArrowRightIcon className="size-3.5" />
						</Button>
					</div>
				</section>
			</main>
		</div>
	);
}
