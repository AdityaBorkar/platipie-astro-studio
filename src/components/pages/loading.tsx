import { BrandMark } from "#/components/gitbook/brand";

/** Full-screen loading state used while route loaders are pending. */
export function LoadingPage({ message = "Loading workspace…" }: { message?: string }) {
	return (
		<div className="relative grid min-h-dvh place-items-center">
			<div aria-hidden="true" className="page-glow" />
			<div className="animate-rise relative flex flex-col items-center gap-3 text-muted-foreground">
				<span className="relative inline-flex size-12 items-center justify-center rounded-xl border border-border bg-card shadow-soft">
					<span
						aria-hidden="true"
						className="absolute inset-0 animate-ping rounded-xl bg-brand/10"
					/>
					<BrandMark className="relative size-6 text-brand" title="" />
				</span>
				<p className="text-sm font-medium">{message}</p>
			</div>
		</div>
	);
}
