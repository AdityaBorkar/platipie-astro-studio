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
import { cn } from "#/lib/utils";

function relativeAge(timestamp: number): string {
	const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
	if (seconds < 60) return "just now";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

/**
 * The one sync badge used by every app page. Relative age stays compact on
 * mobile; the exact watermark lives in the title and the sidebar popover.
 */
export function SyncBadge({
	className,
	lastSync,
}: {
	className?: string;
	lastSync: number | null;
}) {
	const exact = lastSync ? new Date(lastSync).toLocaleString() : "Not synced yet";
	return (
		<Badge
			aria-label={lastSync ? `Last synced ${exact}` : "Never synced"}
			className={cn("font-mono", className)}
			title={exact}
			variant={lastSync ? "success" : "destructive"}
		>
			{lastSync ? `synced ${relativeAge(lastSync)}` : "never synced"}
		</Badge>
	);
}

/** The shared content column for every app screen. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("mx-auto w-page px-5 py-8 sm:py-10", className)}>{children}</div>;
}

interface PageHeaderProps {
	actions?: ReactNode;
	className?: string;
	description?: ReactNode;
	eyebrow: string;
	meta?: ReactNode;
	title: ReactNode;
}

/**
 * App-page header. One structure for every route: eyebrow, display headline,
 * short description, page actions, then a meta row of status badges.
 */
export function PageHeader({
	actions,
	className,
	description,
	eyebrow,
	meta,
	title,
}: PageHeaderProps) {
	return (
		<>
			<header
				className={cn("animate-rise flex flex-wrap items-end justify-between gap-5", className)}
			>
				<div className="max-w-2xl min-w-0">
					<p className="text-11 font-bold tracking-14 text-brand uppercase">{eyebrow}</p>
					<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">{title}</h1>
					{description ? <p className="gb-sub mt-3 max-w-xl text-base">{description}</p> : null}
				</div>
				{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
			</header>
			{meta ? <div className="mt-5 flex flex-wrap items-center gap-1.5">{meta}</div> : null}
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

/** In-page section heading, matching the page header rhythm. */
export function SectionHeader({
	actions,
	className,
	description,
	eyebrow,
	title,
}: SectionHeaderProps) {
	return (
		<div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
			<div className="max-w-2xl">
				<p className="text-11 font-bold tracking-14 text-brand uppercase">{eyebrow}</p>
				<h2 className="mt-2 text-title font-bold tracking-heading">{title}</h2>
				{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
			</div>
			{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
		</div>
	);
}

interface EmptyStateProps {
	action?: ReactNode;
	className?: string;
	/** Drops the tinted panel for use inside a card body. */
	compact?: boolean;
	description?: ReactNode;
	icon?: LucideIcon;
	title: string;
}

/** Neutral empty state — no alert tint, one clear next step. */
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
			className={cn(
				compact ? "border-0 bg-transparent px-4 py-8" : "border-border/80 bg-muted/20",
				className,
			)}
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
