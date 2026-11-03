import { RefreshCwIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "#/components/ui/badge";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { formatRelativeAge } from "#/lib/time";
import { cn } from "#/lib/utils";

/**
 * Unified freshness badge. Pass `lastSync` for the synced timestamp view;
 * pass `refreshing` for the transient updating view (LiveBadge behaviour).
 */
export function SyncBadge({
	className,
	lastSync,
	refreshing = false,
}: {
	className?: string;
	lastSync: number | null;
	refreshing?: boolean;
}) {
	if (refreshing && lastSync === null) {
		return (
			<Badge aria-live="polite" className={cn("font-mono", className)} variant="outline">
				<RefreshCwIcon className="size-3 animate-spin" />
				Updating…
			</Badge>
		);
	}
	const exact = lastSync ? new Date(lastSync).toLocaleString() : "Not synced yet";
	return (
		<Badge
			aria-label={lastSync ? `Last synced ${exact}` : "Never synced"}
			className={cn("font-mono", className)}
			title={exact}
			variant={lastSync ? "success" : "destructive"}
		>
			{lastSync ? `synced ${formatRelativeAge(lastSync)}` : "never synced"}
		</Badge>
	);
}

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("mx-auto w-page px-5 py-8 sm:py-10", className)}>{children}</div>;
}

interface PageHeaderProps {
	actions?: ReactNode;
	as?: "h1" | "h2";
	className?: string;
	compact?: boolean;
	description?: ReactNode;
	eyebrow: string;
	meta?: ReactNode;
	title: ReactNode;
}

export function PageHeader({
	actions,
	as = "h1",
	className,
	compact = false,
	description,
	eyebrow,
	meta,
	title,
}: PageHeaderProps) {
	const TitleTag = as;
	return (
		<>
			<header
				className={cn(
					compact
						? "flex flex-wrap items-end justify-between gap-3"
						: "animate-rise flex flex-wrap items-end justify-between gap-5",
					className,
				)}
			>
				<div className={compact ? "max-w-2xl" : "max-w-2xl min-w-0"}>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">{eyebrow}</p>
					{as === "h1" ? (
						<TitleTag className="gb-display mt-2 text-3xl sm:text-display-sm">{title}</TitleTag>
					) : (
						<TitleTag className="mt-2 text-title font-bold tracking-heading">{title}</TitleTag>
					)}
					{description ? (
						compact ? (
							<p className="mt-1 text-sm text-muted-foreground">{description}</p>
						) : (
							<p className="gb-sub mt-3 max-w-xl text-base">{description}</p>
						)
					) : null}
				</div>
				{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
			</header>
			{meta && !compact ? (
				<div className="mt-5 flex flex-wrap items-center gap-1.5">{meta}</div>
			) : null}
		</>
	);
}

interface SectionHeaderProps {
	actions?: ReactNode;
	className?: string;
	description?: ReactNode;
	eyebrow: string;
	title: ReactNode;
}

/** Compact section header. Prefer PageHeader with as="h2" for new code. */
export function SectionHeader({
	actions,
	className,
	description,
	eyebrow,
	title,
}: SectionHeaderProps) {
	return (
		<PageHeader
			actions={actions}
			as="h2"
			className={className}
			compact
			description={description}
			eyebrow={eyebrow}
			title={title}
		/>
	);
}

interface EmptyStateProps {
	action?: ReactNode;
	className?: string;
	compact?: boolean;
	description?: ReactNode;
	icon?: LucideIcon;
	title: string;
}

/** Thin wrapper over Empty. Prefer Empty directly for new code. */
export function EmptyState({
	action,
	className,
	compact = false,
	description,
	icon: Icon,
	title,
}: EmptyStateProps) {
	return (
		<Empty
			className={cn(compact ? "border-0 bg-transparent px-4 py-8" : undefined, className)}
			variant={compact ? "default" : "muted"}
		>
			<EmptyHeader>
				{Icon ? (
					<EmptyMedia variant="icon">
						<Icon className="size-4" />
					</EmptyMedia>
				) : null}
				<EmptyTitle>{title}</EmptyTitle>
				{description ? <EmptyDescription>{description}</EmptyDescription> : null}
			</EmptyHeader>
			{action ? <EmptyContent>{action}</EmptyContent> : null}
		</Empty>
	);
}
