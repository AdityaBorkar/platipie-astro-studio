import { SearchIcon } from "lucide-react";

import { Kbd } from "#/components/ui/kbd";
import { cn } from "#/lib/utils";

interface SearchTriggerProps {
	className?: string;
	placeholder?: string;
	onClick?: () => void;
}

/** GitBook docs search affordance: rounded trigger with ⌘K hint. */
export function SearchTrigger({ className, placeholder, onClick }: SearchTriggerProps) {
	return (
		<button className={cn("gb-search-trigger", className)} onClick={onClick} type="button">
			<SearchIcon className="size-3.5 shrink-0" />
			<span className="flex-1 truncate text-left">{placeholder ?? "Search…"}</span>
			<span className="hidden items-center gap-0.5 sm:inline-flex">
				<Kbd>⌘</Kbd>
				<Kbd>K</Kbd>
			</span>
		</button>
	);
}
