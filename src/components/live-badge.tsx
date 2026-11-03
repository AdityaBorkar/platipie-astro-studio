import { SyncBadge } from "#/components/gitbook/page";

/** Renders nothing at rest to avoid layout shift; visible only during refresh. */
export function LiveBadge({ className, refreshing }: { className?: string; refreshing: boolean }) {
	if (!refreshing) return null;
	return <SyncBadge className={className} lastSync={null} refreshing />;
}
