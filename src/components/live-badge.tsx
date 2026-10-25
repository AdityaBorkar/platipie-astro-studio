import { RefreshCwIcon } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";

/**
 * Quiet background-refresh pill. Renders nothing at rest so cached content
 * never shifts; appears only while a stale-while-revalidate fetch is in flight.
 */
export function LiveBadge({ className, refreshing }: { className?: string; refreshing: boolean }) {
	if (!refreshing) return null;
	return (
		<Badge aria-live="polite" className={cn("font-mono", className)} variant="outline">
			<RefreshCwIcon className="size-3 animate-spin" />
			Updating…
		</Badge>
	);
}
