import { cn } from "#/lib/utils";

interface BrandMarkProps {
	className?: string;
	title?: string;
}

export function BrandMark({ className, title = "platipie" }: BrandMarkProps) {
	return (
		<svg
			aria-hidden={title ? undefined : true}
			className={cn("size-6", className)}
			fill="none"
			role={title ? "img" : undefined}
			viewBox="0 0 24 24"
		>
			{title ? <title>{title}</title> : null}
			<path
				d="M12 3.25 3.4 7.6a.7.7 0 0 0 0 1.26L12 13.2l8.6-4.34a.7.7 0 0 0 0-1.26L12 3.25Z"
				fill="currentColor"
			/>
			<path
				d="m4.1 11.4 7.35 3.7a1.2 1.2 0 0 0 1.1 0l7.35-3.7"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.7"
			/>
			<path
				d="m4.1 15.55 7.35 3.7a1.2 1.2 0 0 0 1.1 0l7.35-3.7"
				opacity="0.55"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.7"
			/>
		</svg>
	);
}

interface WordmarkProps {
	className?: string;
	markClassName?: string;
	label?: string;
	badge?: string;
}

export function Wordmark({ badge, className, label = "platipie", markClassName }: WordmarkProps) {
	return (
		<span className={cn("inline-flex items-center gap-2", className)}>
			<BrandMark className={cn("size-6 text-foreground", markClassName)} />
			<span className="text-15 font-bold tracking-tight text-foreground">{label}</span>
			{badge ? (
				<span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-9 font-medium tracking-wide text-muted-foreground uppercase ring-1 ring-border">
					{badge}
				</span>
			) : null}
		</span>
	);
}
