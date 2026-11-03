import { ChevronRightIcon, FolderIcon, FolderOpenIcon, FolderTreeIcon } from "lucide-react";

import { FileTypeIcon } from "#/components/file-type-icon";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import type { RecentEntry } from "./model";
import { entryExt } from "./model";

export interface TreeGroup {
	collection: { id: string; label: string; source: string };
	entries: RecentEntry[];
}

export function FolderSection({
	collapsed,
	group,
	onSelect,
	onToggle,
	searching,
	selectedPath,
}: {
	collapsed: boolean;
	group: TreeGroup;
	onSelect: (entry: RecentEntry) => void;
	onToggle: (id: string) => void;
	searching: boolean;
	selectedPath: string | null;
}) {
	const open = searching || !collapsed;
	const count = group.entries.length;

	return (
		<div className="scroll-mt-3" data-collection-id={group.collection.id}>
			<button
				aria-expanded={open}
				className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40"
				onClick={() => {
					if (searching) return;
					const opening = collapsed;
					onToggle(group.collection.id);
					// KEEP auto-select: opening a collapsed collection selects its first
					// entry so keyboard/screen-reader users land on content immediately.
					// Independent toggles (parent) stay untouched; only selection moves.
					const first = group.entries[0];
					if (opening && first) onSelect(first);
				}}
				type="button"
			>
				<ChevronRightIcon
					className={cn(
						"size-3 shrink-0 text-muted-foreground transition-transform",
						open && "rotate-90",
					)}
				/>
				{open ? (
					<FolderOpenIcon className="size-3.5 shrink-0 text-brand" />
				) : (
					<FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
				)}
				<span className="min-w-0 flex-1">
					<span className="block truncate text-12 font-semibold">{group.collection.label}</span>
					<span className="block truncate font-mono text-9 text-muted-foreground">
						{group.collection.source}
					</span>
				</span>
				<span className="font-mono text-10 text-muted-foreground">{count}</span>
			</button>

			{open && count === 0 ? (
				<p className="pl-9 text-10 text-muted-foreground">No entries</p>
			) : null}

			{open && count > 0 ? (
				<ul className="mt-0.5 ml-4 grid gap-0.5 border-l border-border/70 pl-2">
					{group.entries.map((entry) => {
						const selected = entry.path === selectedPath;
						return (
							<li key={entry.path}>
								<button
									aria-pressed={selected}
									className={cn(
										"flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
										selected ? "bg-card ring-1 ring-border" : "hover:bg-muted/70",
									)}
									onClick={() => onSelect(entry)}
									type="button"
								>
									<FileTypeIcon
										className={selected ? "text-brand" : "text-muted-foreground"}
										ext={entryExt(entry.path)}
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-13 font-semibold">
											{entry.title ?? entry.id}
										</span>
										<span className="block truncate font-mono text-9 text-muted-foreground">
											{entry.id}
										</span>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			) : null}
		</div>
	);
}

export function CollectionTreeSkeleton() {
	return (
		<div className="grid gap-2 p-2">
			<Skeleton className="h-12 w-full" />
			<Skeleton className="h-12 w-full" />
			<Skeleton className="h-12 w-full" />
		</div>
	);
}

export function CollectionTreeHeader({ count }: { count: number }) {
	return (
		<div className="flex items-center justify-between gap-2 px-2 pb-2">
			<div className="flex min-w-0 items-center gap-1.5">
				<FolderTreeIcon className="size-3.5 shrink-0 text-brand" />
				<span className="truncate text-11 font-bold tracking-12 text-muted-foreground uppercase">
					Collections
				</span>
			</div>
			<Badge className="font-mono" variant="secondary">
				{count}
			</Badge>
		</div>
	);
}
