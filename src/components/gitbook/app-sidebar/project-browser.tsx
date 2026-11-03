import {
	ArrowLeftIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronRightIcon,
	FolderIcon,
	HomeIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";
import { cn } from "#/lib/utils";
import type { BrowseView } from "./hooks";

const browsePlaceIcons: Record<string, LucideIcon> = {
	Home: HomeIcon,
};

function ProjectBrowser({
	browse,
	browseError,
	browseLoading,
	onBack,
	onOpenFolder,
	onSelectFolder,
	selectDisabled,
	selectLabel,
}: {
	browse: BrowseView | null;
	browseError: string | null;
	browseLoading: boolean;
	onBack: () => void;
	onOpenFolder: (path?: string) => void;
	onSelectFolder: () => void;
	selectDisabled: boolean;
	selectLabel: string;
}) {
	return (
		<>
			<div className="flex items-center gap-1.5">
				<Button aria-label="Back to project list" onClick={onBack} size="icon-sm" variant="ghost">
					<ArrowLeftIcon />
				</Button>
				<div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5">
					<FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="truncate font-mono text-11 text-muted-foreground">
						{browse?.displayPath ?? "Loading…"}
					</span>
				</div>
				<Button
					aria-label="Parent folder"
					disabled={!browse?.parent || browseLoading}
					onClick={() => {
						if (browse?.parent) onOpenFolder(browse.parent);
					}}
					size="icon-sm"
					variant="ghost"
				>
					<ArrowUpIcon />
				</Button>
			</div>

			<div className="flex max-h-58vh min-h-40 gap-2">
				<div className="w-36 shrink-0">
					<p className="px-2 pb-1 text-9 font-bold tracking-12 text-muted-foreground uppercase">
						Places
					</p>
					<ul className="grid gap-0.5">
						{(browse?.places ?? []).map((place) => {
							const PlaceIcon = browsePlaceIcons[place.label] ?? FolderIcon;
							return (
								<li key={place.path}>
									<button
										className={cn(
											"flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-11 transition-colors",
											browse?.path === place.path
												? "bg-sidebar-accent font-semibold text-foreground"
												: "text-muted-foreground hover:bg-muted hover:text-foreground",
										)}
										onClick={() => onOpenFolder(place.path)}
										type="button"
									>
										<PlaceIcon className="size-3 shrink-0" />
										<span className="truncate">{place.label}</span>
									</button>
								</li>
							);
						})}
					</ul>
				</div>

				<div className="min-h-0 min-w-0 flex-1 overflow-y-auto border-l border-border pl-2">
					{browseLoading && !browse ? (
						<div aria-label="Loading folders" className="grid gap-1.5">
							<div className="h-11 animate-pulse rounded-lg bg-muted" />
							<div className="h-11 animate-pulse rounded-lg bg-muted" />
							<div className="h-11 animate-pulse rounded-lg bg-muted" />
						</div>
					) : browseError ? (
						<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
							<p className="text-13 font-semibold text-foreground">Cannot open folder</p>
							<p className="mt-1 text-12 text-muted-foreground">{browseError}</p>
						</div>
					) : browse ? (
						browse.entries.length === 0 ? (
							<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
								<p className="text-13 font-semibold text-foreground">No folders here</p>
								<p className="mt-1 text-12 text-muted-foreground">Go up a level to keep looking.</p>
							</div>
						) : (
							<ul className="grid gap-0.5">
								{browse.entries.map((entry) => (
									<li key={entry.path}>
										<button
											className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
											onClick={() => onOpenFolder(entry.path)}
											type="button"
										>
											<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
												<FolderIcon className="size-3.5" />
											</span>
											<span className="min-w-0 flex-1 truncate text-13 font-semibold text-foreground">
												{entry.name}
											</span>
											{entry.isAstro ? (
												<span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-9 font-bold text-brand uppercase">
													Astro
												</span>
											) : null}
											<ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
										</button>
									</li>
								))}
							</ul>
						)
					) : null}
					{browse?.truncated ? (
						<p className="p-2 text-10 text-muted-foreground">Showing the first 300 folders.</p>
					) : null}
				</div>
			</div>

			<DialogFooter className="items-center gap-2">
				<p className="min-w-0 flex-1 text-11 text-muted-foreground">
					{browse?.isAstro ? (
						<span className="inline-flex items-center gap-1 font-semibold text-brand">
							<CheckIcon className="size-3" />
							Astro project detected
						</span>
					) : (
						"Pick a folder that contains astro.config.* to enable Add project."
					)}
				</p>
				<Button disabled={selectDisabled} onClick={onSelectFolder} size="sm">
					{selectLabel}
				</Button>
			</DialogFooter>
		</>
	);
}

export { ProjectBrowser };
