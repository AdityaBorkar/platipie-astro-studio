import { RefreshCwIcon } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";

/** Renders nothing at rest to avoid layout shift; visible only during refresh. */
export function LiveBadge({ className, refreshing }: { className?: string; refreshing: boolean }) {
	if (!refreshing) return null;
	return (
		<Badge aria-live="polite" className={cn("font-mono", className)} variant="outline">
			<RefreshCwIcon className="size-3 animate-spin" />
			Updating…
		</Badge>
	);
}
