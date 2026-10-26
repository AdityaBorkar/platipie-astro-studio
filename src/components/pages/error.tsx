import { Link } from "@tanstack/react-router";
import { HouseIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { BrandMark } from "#/components/gitbook/brand";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";

function describeError(error: unknown): { title: string; message: string } {
	if (error instanceof Error) {
		return { message: error.message, title: error.name };
	}
	return {
		message: typeof error === "string" ? error : "An unknown error occurred.",
		title: "Unexpected error",
	};
}

export function ErrorPage({ error, reset }: { error: unknown; reset: () => void }) {
	const { title, message } = describeError(error);
	const stack = error instanceof Error ? error.stack : undefined;

	return (
		<div className="relative grid min-h-dvh place-items-center p-5">
			<div aria-hidden="true" className="page-glow" />
			<Card className="animate-rise relative w-full max-w-lg p-2 text-center shadow-soft">
				<CardContent className="p-6">
					<div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
						<TriangleAlertIcon className="size-5" />
					</div>
					<h1 className="mt-4 text-2xl font-bold tracking-heading">Something went wrong</h1>
					<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
						<span className="font-semibold text-foreground">{title}</span>: {message}
					</p>
					{stack ? (
						<details className="mt-4 text-left">
							<summary className="text-xs font-semibold text-muted-foreground hover:text-foreground">
								Stack trace
							</summary>
							<pre className="code-surface mt-2 max-h-48 overflow-auto p-3 font-mono text-11 leading-relaxed">
								{stack}
							</pre>
						</details>
					) : null}
					<div className="mt-5 flex items-center justify-center gap-2">
						<Button onClick={reset} size="sm">
							<RotateCcwIcon className="size-3.5" />
							Try again
						</Button>
						<Button
							nativeButton={false}
							render={<Link to="/dashboard" />}
							size="sm"
							variant="outline"
						>
							<HouseIcon className="size-3.5" />
							Back to dashboard
						</Button>
					</div>
					<div className="mt-6 flex items-center justify-center gap-2 text-11 text-muted-foreground">
						<BrandMark className="size-3.5 text-brand" title="" />
						platipie-cms · local-first
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
