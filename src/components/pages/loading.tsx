import { Spinner } from "#/components/ui/spinner";

/** Full-screen loading state used while route loaders are pending. */
export function LoadingPage({ message = "Loading…" }: { message?: string }) {
	return (
		<div className="relative grid min-h-dvh place-items-center">
			<div aria-hidden="true" className="page-glow" />
			<div className="animate-rise relative flex flex-col items-center gap-3 text-muted-foreground">
				<Spinner className="size-6 text-primary" />
				<p className="text-sm">{message}</p>
			</div>
		</div>
	);
}
