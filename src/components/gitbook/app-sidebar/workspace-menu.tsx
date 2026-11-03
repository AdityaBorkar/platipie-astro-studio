import {
	ChevronsUpDownIcon,
	FileTextIcon,
	FolderPlusIcon,
	GitBranchIcon,
	LayoutGridIcon,
	ListIcon,
	SearchIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { cn } from "#/lib/utils";
import { BrandMark } from "../brand";
import type { BrowseView, ProjectEntry, WorkspacePayload } from "./hooks";
import { ProjectBrowser } from "./project-browser";

function fetchProjects(signal?: AbortSignal): Promise<{ projects?: ProjectEntry[] }> {
	return fetchJson<{ projects?: ProjectEntry[] }>("/api/cms/projects", { signal });
}

function ProjectFavicon({ entry }: { entry: ProjectEntry }) {
	if (entry.favicon) {
		return <img alt="" className="size-8 shrink-0 rounded-md object-contain" src={entry.favicon} />;
	}
	return (
		<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
			<FileTextIcon className="size-3.5" />
		</span>
	);
}

function ProjectName({ entry }: { entry: ProjectEntry }) {
	return (
		<span className="flex items-center gap-1.5">
			<span className="truncate text-13 font-semibold text-foreground">{entry.name}</span>
			{entry.current ? (
				<span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-9 font-bold text-brand uppercase">
					Current
				</span>
			) : null}
		</span>
	);
}

function ProjectBranch({ entry, switching }: { entry: ProjectEntry; switching: string | null }) {
	return (
		<span className="flex shrink-0 items-center gap-1 font-mono text-10 text-muted-foreground">
			<GitBranchIcon className="size-3" />
			<span className="max-w-24 truncate">
				{switching === entry.root ? "switching…" : entry.branch}
			</span>
		</span>
	);
}

function ProjectEntryButton({
	entry,
	layout,
	onSelect,
	switching,
}: {
	entry: ProjectEntry;
	layout: "cards" | "list";
	onSelect: (entry: ProjectEntry) => void;
	switching: string | null;
}) {
	if (layout === "cards") {
		return (
			<li>
				<button
					className={cn(
						"flex size-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-card",
						switching === null
							? "hover:border-foreground/15 hover:shadow-soft"
							: "cursor-not-allowed opacity-55",
					)}
					disabled={switching !== null}
					onClick={() => onSelect(entry)}
					title={entry.root}
					type="button"
				>
					<span className="flex items-center justify-between gap-1.5">
						<ProjectFavicon entry={entry} />
						<ProjectBranch entry={entry} switching={switching} />
					</span>
					<span className="min-w-0">
						<ProjectName entry={entry} />
						<span className="mt-0.5 block truncate font-mono text-10 text-muted-foreground">
							{entry.displayPath}
						</span>
					</span>
				</button>
			</li>
		);
	}
	return (
		<li>
			<button
				className={cn(
					"flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40",
					switching === null ? "hover:bg-muted" : "cursor-not-allowed opacity-55",
				)}
				disabled={switching !== null}
				onClick={() => onSelect(entry)}
				title={entry.root}
				type="button"
			>
				<ProjectFavicon entry={entry} />
				<span className="min-w-0 flex-1">
					<ProjectName entry={entry} />
					<span className="block truncate font-mono text-10 text-muted-foreground">
						{entry.displayPath}
					</span>
				</span>
				<ProjectBranch entry={entry} switching={switching} />
			</button>
		</li>
	);
}

function WorkspaceMenu({
	onNavigate,
	workspace,
	workspaceError,
}: {
	onNavigate?: () => void;
	workspace: WorkspacePayload | null;
	workspaceError: string | null;
}) {
	const [open, setOpen] = useState(false);
	const [autoOpened, setAutoOpened] = useState(false);
	const [query, setQuery] = useState("");
	const [switching, setSwitching] = useState<string | null>(null);
	const [view, setView] = useState<"cards" | "list">("list");
	const [mode, setMode] = useState<"browse" | "select">("select");
	const [browse, setBrowse] = useState<BrowseView | null>(null);
	const [browseError, setBrowseError] = useState<string | null>(null);
	const [browseLoading, setBrowseLoading] = useState(false);

	const projectsQuery = useCachedFetch("/api/cms/projects", fetchProjects, {
		enabled: open,
		errorMessage: "Could not load projects",
	});
	const projectsRefresh = projectsQuery.refresh;
	const entries = projectsQuery.data?.projects ?? null;
	const projectsError = projectsQuery.error;

	useEffect(() => {
		if (open) return;
		setBrowse(null);
		setBrowseError(null);
		setMode("select");
		setQuery("");
	}, [open]);

	// When the server starts outside an Astro project (e.g. `bunx @platipie/astro-studio`
	// from a non-Astro folder) the Project Selector opens by default.
	useEffect(() => {
		if (!autoOpened && workspace && workspace.isAstro === false) {
			setAutoOpened(true);
			setOpen(true);
		}
	}, [autoOpened, workspace]);

	const needle = query.trim().toLowerCase();
	const filtered = (entries ?? []).filter(
		(entry) =>
			needle.length === 0 ||
			entry.name.toLowerCase().includes(needle) ||
			entry.branch.toLowerCase().includes(needle) ||
			entry.displayPath.toLowerCase().includes(needle),
	);

	async function openFolder(target?: string) {
		setBrowseError(null);
		setBrowseLoading(true);
		try {
			const queryString = target ? `?path=${encodeURIComponent(target)}` : "";
			setBrowse(await fetchJson<BrowseView>(`/api/cms/projects/browse${queryString}`));
		} catch (error: unknown) {
			setBrowse(null);
			setBrowseError(error instanceof Error ? error.message : "Could not open folder");
		} finally {
			setBrowseLoading(false);
		}
	}

	function startBrowse() {
		setBrowseError(null);
		setMode("browse");
		void openFolder(browse?.path);
	}

	async function switchProject(root: string) {
		if (switching !== null) return;
		setSwitching(root);
		try {
			await fetchJson("/api/cms/projects", {
				body: JSON.stringify({ root }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			setOpen(false);
			window.location.reload();
		} catch (error: unknown) {
			setSwitching(null);
			toast.error(error instanceof Error ? error.message : "Project switch failed");
		}
	}

	function selectProject(entry: ProjectEntry) {
		if (switching !== null) return;
		if (entry.current) {
			setOpen(false);
			onNavigate?.();
			return;
		}
		void switchProject(entry.root);
	}

	function addProject() {
		if (!browse?.isAstro || browseLoading) return;
		void switchProject(browse.path);
	}

	return (
		<>
			<button
				aria-haspopup="dialog"
				className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/40"
				onClick={() => setOpen(true)}
				type="button"
			>
				<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<BrandMark className="size-4" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-13 font-bold tracking-tight">
						{workspace?.project ?? "platipie-astro-studio"}
					</span>
					<span className="mt-0.5 flex items-center gap-1 text-10 text-muted-foreground">
						<GitBranchIcon className="size-3 shrink-0" />
						<span className="truncate">
							{workspace?.branch ?? (workspaceError ? "unavailable" : "loading…")}
						</span>
						{workspace && !workspace.reachable ? (
							<span className="text-destructive">· offline</span>
						) : null}
					</span>
				</span>
				<ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
			</button>

			<Dialog onOpenChange={setOpen} open={open}>
				<DialogContent className="gap-3 sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>{mode === "select" ? "Select project" : "Add project"}</DialogTitle>
					</DialogHeader>

					{mode === "select" ? (
						<>
							<div className="flex items-center gap-2">
								<div className="relative min-w-0 flex-1">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<Input
										aria-label="Search projects"
										className="h-8 pl-8 text-13"
										onChange={(event) => setQuery(event.target.value)}
										placeholder="Search projects…"
										value={query}
									/>
								</div>
								<div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-muted p-0.5">
									<button
										aria-label="List view"
										aria-pressed={view === "list"}
										className={cn(
											"inline-flex size-7 items-center justify-center rounded-full transition-colors",
											view === "list"
												? "bg-card text-foreground shadow-soft"
												: "text-muted-foreground hover:text-foreground",
										)}
										onClick={() => setView("list")}
										type="button"
									>
										<ListIcon className="size-3.5" />
									</button>
									<button
										aria-label="Card view"
										aria-pressed={view === "cards"}
										className={cn(
											"inline-flex size-7 items-center justify-center rounded-full transition-colors",
											view === "cards"
												? "bg-card text-foreground shadow-soft"
												: "text-muted-foreground hover:text-foreground",
										)}
										onClick={() => setView("cards")}
										type="button"
									>
										<LayoutGridIcon className="size-3.5" />
									</button>
								</div>
								<Button className="shrink-0" onClick={startBrowse} size="sm">
									<FolderPlusIcon />
									Add project
								</Button>
							</div>

							<div className="max-h-58vh min-h-40 overflow-y-auto pr-0.5">
								{entries === null ? (
									<div className="grid gap-1.5" aria-label="Loading projects">
										<div className="h-11 animate-pulse rounded-lg bg-muted" />
										<div className="h-11 animate-pulse rounded-lg bg-muted" />
										<div className="h-11 animate-pulse rounded-lg bg-muted" />
									</div>
								) : projectsError ? (
									<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
										<p className="text-13 font-semibold text-foreground">
											Couldn&apos;t load projects
										</p>
										<p className="mt-1 text-12 text-muted-foreground">{projectsError}</p>
										<Button className="mt-3" onClick={() => projectsRefresh()} size="sm">
											Retry
										</Button>
									</div>
								) : filtered.length === 0 ? (
									<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
										<p className="text-13 font-semibold text-foreground">
											{query ? "No matches" : "No Astro projects yet"}
										</p>
										<p className="mt-1 text-12 text-muted-foreground">
											{query
												? `Nothing matches “${query}”.`
												: "Use Add project to open a folder with astro.config.*."}
										</p>
									</div>
								) : view === "list" ? (
									<ul className="grid gap-0.5">
										{filtered.map((entry) => (
											<ProjectEntryButton
												entry={entry}
												key={entry.root}
												layout="list"
												onSelect={selectProject}
												switching={switching}
											/>
										))}
									</ul>
								) : (
									<ul className="grid grid-cols-2 gap-2">
										{filtered.map((entry) => (
											<ProjectEntryButton
												entry={entry}
												key={entry.root}
												layout="cards"
												onSelect={selectProject}
												switching={switching}
											/>
										))}
									</ul>
								)}
							</div>
						</>
					) : (
						<ProjectBrowser
							browse={browse}
							browseError={browseError}
							browseLoading={browseLoading}
							onBack={() => setMode("select")}
							onOpenFolder={(path) => void openFolder(path)}
							onSelectFolder={addProject}
							selectDisabled={!browse?.isAstro || browseLoading || switching !== null}
							selectLabel={switching === browse?.path ? "Adding…" : "Add project"}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

export { ProjectEntryButton, WorkspaceMenu };
