import { ClockIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatRelativeAge } from "#/lib/time";
import { cn } from "#/lib/utils";

interface SyncStatusBarProps {
	className?: string;
	lastSync: number | null;
	loading?: boolean;
	onRefresh?: () => void;
	refreshing?: boolean;
	stale?: boolean;
}

const absoluteFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

function SyncStatusBar({
	className,
	lastSync,
	loading = false,
	onRefresh,
	refreshing = false,
	stale = false,
}: SyncStatusBarProps) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (lastSync === null) return;
		setNow(Date.now());
		const timer = window.setInterval(() => setNow(Date.now()), 30_000);
		return () => window.clearInterval(timer);
	}, [lastSync]);

	const synced = lastSync !== null;
	const label = refreshing
		? "Syncing"
		: loading
			? "Checking"
			: stale
				? "Sync failed"
				: synced
					? "Live"
					: "Never synced";
	const absolute = synced ? absoluteFormatter.format(new Date(lastSync)) : "Not synced yet";
	const dotClass = refreshing
		? "bg-brand"
		: loading
			? "animate-pulse bg-muted-foreground"
			: stale
				? "bg-destructive"
				: synced
					? "bg-brand-mint ring-1 ring-brand-mint-foreground/30"
					: "bg-muted-foreground";
	const labelClass =
		stale && !loading ? "text-destructive" : synced ? "text-foreground" : "text-muted-foreground";

	return (
		<div className={cn("flex items-center justify-end gap-1", className)}>
			<Tooltip>
				<TooltipTrigger
					render={
						<span
							aria-label={`Sync status: ${label}. ${
								loading
									? "Reading sync status."
									: synced
										? `Last synced ${absolute}.`
										: "Never synced."
							}`}
							className="flex h-8 min-w-0 flex-1 items-center justify-end gap-2 rounded-lg px-2 text-left outline-none hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/40"
						/>
					}
				>
					<span aria-hidden="true" className="relative flex size-1.5 shrink-0">
						{!loading && !stale && synced && !refreshing ? (
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-mint opacity-60" />
						) : null}
						<span className={cn("relative inline-flex size-1.5 rounded-full", dotClass)} />
					</span>
					<span className={cn("truncate text-11 font-semibold", labelClass)}>{label}</span>
					{synced ? (
						<span className="shrink-0 font-mono text-10 text-muted-foreground">
							{formatRelativeAge(lastSync, now)}
						</span>
					) : null}
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<div className="flex items-start gap-2">
						<ClockIcon className="mt-px size-3.5 shrink-0 text-muted-foreground" />
						<div className="min-w-0">
							<p className="text-10 text-muted-foreground">Last synced</p>
							<p className="truncate text-12 font-semibold">
								{loading ? "Reading sync status…" : absolute}
							</p>
							{stale && !loading ? (
								<p className="mt-1 text-10 leading-snug text-destructive">
									Couldn&apos;t finish the last sync. The inventory may be out of date.
								</p>
							) : null}
						</div>
					</div>
				</TooltipContent>
			</Tooltip>
			{onRefresh ? (
				<Button
					aria-label="Sync now"
					className="shrink-0"
					disabled={refreshing}
					onClick={onRefresh}
					size="icon-xs"
					title="Sync now"
					variant="ghost"
				>
					<RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} />
				</Button>
			) : null}
		</div>
	);
}

export { SyncStatusBar };
export type { SyncStatusBarProps };
