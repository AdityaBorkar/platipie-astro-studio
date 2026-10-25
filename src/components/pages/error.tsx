import { Link } from "@tanstack/react-router";
import { HouseIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

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

/** Full-screen error state shown when a route throws. */
export function ErrorPage({ error, reset }: { error: unknown; reset: () => void }) {
	const { title, message } = describeError(error);
	const stack = error instanceof Error ? error.stack : undefined;

	return (
		<div className="relative grid min-h-dvh place-items-center p-5">
			<div aria-hidden="true" className="page-glow" />
			<Card className="animate-rise relative w-full max-w-md p-6 text-center">
				<CardContent className="p-0">
					<div className="mx-auto flex size-10 items-center justify-center bg-destructive/10">
						<TriangleAlertIcon className="size-5 text-destructive" />
					</div>
					<h1 className="mt-4 text-lg font-semibold tracking-tight">Something went wrong</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						<span className="font-medium text-foreground">{title}</span>: {message}
					</p>
					{stack ? (
						<details className="mt-4 text-left">
							<summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
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
						<Button nativeButton={false} render={<Link to="/" />} size="sm" variant="outline">
							<HouseIcon className="size-3.5" />
							Back to home
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
