import { ClockIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
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

function relativeLabel(from: number, now: number): string {
	const seconds = Math.round((now - from) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

/**
 * Footer status strip: quiet at rest, expands on hover or keyboard focus to
 * show the exact sync watermark and a manual re-sync action.
 */
function SyncStatusBar({
	className,
	lastSync,
	loading = false,
	onRefresh,
	refreshing = false,
	stale = false,
}: SyncStatusBarProps) {
	const [pinned, setPinned] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const panelId = useId();
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (lastSync === null) return;
		setNow(Date.now());
		const timer = window.setInterval(() => setNow(Date.now()), 30_000);
		return () => window.clearInterval(timer);
	}, [lastSync]);

	useEffect(() => {
		if (!pinned) return;
		function dismiss(event: PointerEvent) {
			if (!rootRef.current?.contains(event.target as Node)) setPinned(false);
		}
		document.addEventListener("pointerdown", dismiss);
		return () => document.removeEventListener("pointerdown", dismiss);
	}, [pinned]);

	useEffect(() => {
		function escape(event: globalThis.KeyboardEvent) {
			if (event.key !== "Escape") return;
			const active = document.activeElement;
			if (!(active instanceof HTMLElement) || !rootRef.current?.contains(active)) return;
			setPinned(false);
			active.blur();
		}
		document.addEventListener("keydown", escape);
		return () => document.removeEventListener("keydown", escape);
	}, []);

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
	const iso = synced ? new Date(lastSync).toISOString() : undefined;
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
		<div className={cn("group/sync relative", className)} ref={rootRef}>
			<button
				aria-controls={panelId}
				aria-expanded={pinned}
				aria-label={`Sync status: ${label}. ${
					loading ? "Reading sync status." : synced ? `Last synced ${absolute}.` : "Never synced."
				}`}
				className={cn(
					"flex h-8 w-full min-w-0 items-center justify-end gap-2 rounded-lg px-2 text-left transition-colors",
					"group-hover/sync:bg-sidebar-accent",
					pinned && "bg-sidebar-accent",
				)}
				onClick={() => setPinned((value) => !value)}
				type="button"
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
						{relativeLabel(lastSync, now)}
					</span>
				) : null}
			</button>

			<div
				className={cn(
					"absolute inset-x-0 bottom-full z-20 pb-2 group-hover/sync:block",
					pinned ? "block" : "hidden",
				)}
				id={panelId}
			>
				<div className="animate-gb-pop rounded-xl border border-border bg-card p-3 shadow-lift">
					<div className="flex items-center justify-between gap-2">
						<p className="text-9 font-bold tracking-12 text-muted-foreground uppercase">
							Sync status
						</p>
						<span
							className={cn("inline-flex items-center gap-1 text-10 font-semibold", labelClass)}
						>
							<span aria-hidden="true" className={cn("size-1.5 rounded-full", dotClass)} />
							{label}
						</span>
					</div>

					<div className="mt-2 flex items-start gap-2">
						<ClockIcon className="mt-px size-3.5 shrink-0 text-muted-foreground" />
						<div className="min-w-0">
							<p className="text-10 text-muted-foreground">Last synced</p>
							{loading ? (
								<p className="text-12 font-semibold text-muted-foreground">Reading sync status…</p>
							) : synced ? (
								<time className="block truncate text-12 font-semibold" dateTime={iso}>
									{absolute}
								</time>
							) : (
								<p className="text-12 font-semibold">Not synced yet</p>
							)}
						</div>
					</div>

					{stale && !loading ? (
						<p className="mt-1.5 text-10 leading-snug text-destructive">
							Couldn&apos;t finish the last sync. The inventory may be out of date.
						</p>
					) : null}

					{onRefresh ? (
						<Button
							className="mt-3 w-full"
							disabled={refreshing}
							onClick={onRefresh}
							size="sm"
							type="button"
						>
							<RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} />
							{refreshing ? "Syncing…" : "Sync now"}
						</Button>
					) : null}
				</div>
			</div>
		</div>
	);
}

export { SyncStatusBar };
export type { SyncStatusBarProps };
