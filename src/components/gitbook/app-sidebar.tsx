import { Link, useRouterState } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronRightIcon,
	ChevronsUpDownIcon,
	DatabaseIcon,
	FileCogIcon,
	FileIcon,
	FileStackIcon,
	FileTextIcon,
	FolderIcon,
	FolderPlusIcon,
	GitBranchIcon,
	HomeIcon,
	ImageIcon,
	LayoutDashboardIcon,
	LayoutGridIcon,
	ListIcon,
	MailIcon,
	MenuIcon,
	PaletteIcon,
	SearchIcon,
	Settings2Icon,
	ShapesIcon,
	XIcon,
	ZapIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { SyncStatusBar } from "#/components/sync-status-bar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";
import { BrandMark } from "./brand";

interface ShellLink {
	description?: string;
	href: string;
	label: string;
}

interface WorkspacePayload {
	branch: string;
	emailCount: number;
	pages: {
		kind: "dynamic" | "static" | "utility";
		path: string;
		route: string;
		title: string;
		type: string;
	}[];
	project: string;
	reachable: boolean;
}

interface CollectionSummary {
	count: number;
	id: string;
	label: string;
	source: string;
}

interface SyncScopeStatus {
	fileCount: number;
	lastSync: number | null;
	scope: string;
}

function overallLastSync(status: SyncScopeStatus[] | null): number | null {
	if (status === null || status.length === 0) return null;
	const stamps = status.map((entry) => entry.lastSync);
	if (stamps.some((stamp) => stamp === null)) return null;
	return Math.min(...(stamps as number[]));
}

const designLinks: ShellLink[] = [
	{ href: "/design", label: "Design System" },
	{ href: "/design#brand", label: "Brand Guidelines" },
	{ href: "/design#style", label: "Style Guide" },
	{ href: "/design#languages", label: "Design Languages" },
	{ href: "/design#motion", label: "Animations" },
	{ href: "/design#viewports", label: "Viewports" },
	{ href: "/design#tokens", label: "Tokens" },
];

const componentLinks: ShellLink[] = [
	{ href: "/components", label: "Components" },
	{ href: "/components#synced", label: "Synced inventory" },
	{ href: "/components#templates", label: "Templates" },
	{ href: "/components#ui", label: "UI" },
];

function useWorkspace() {
	const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
	useEffect(() => {
		let alive = true;
		fetch("/api/cms/workspace")
			.then((response) => response.json())
			.then((json: WorkspacePayload) => {
				if (alive) setWorkspace(json);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	return workspace;
}

function useCollections() {
	const [collections, setCollections] = useState<CollectionSummary[]>([]);
	useEffect(() => {
		let alive = true;
		fetch("/api/cms/collections")
			.then((response) => response.json())
			.then((json: { collections?: CollectionSummary[] }) => {
				if (alive) setCollections(json.collections ?? []);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	return collections;
}

function useSyncStatus() {
	const [status, setStatus] = useState<SyncScopeStatus[] | null>(null);
	const [syncError, setSyncError] = useState(false);
	const [syncing, setSyncing] = useState(false);

	useEffect(() => {
		let alive = true;
		fetch("/api/cms/sync")
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load sync status");
				return json as { status?: SyncScopeStatus[] };
			})
			.then((json) => {
				if (alive) {
					setStatus(json.status ?? []);
					setSyncError(false);
				}
			})
			.catch(() => {
				if (alive) setSyncError(true);
			});
		return () => {
			alive = false;
		};
	}, []);

	async function resync() {
		setSyncing(true);
		try {
			const response = await fetch("/api/cms/sync", {
				body: JSON.stringify({}),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Re-sync failed");
			setStatus((json as { status?: SyncScopeStatus[] }).status ?? []);
			setSyncError(false);
			toast.success("Inventory re-synced");
		} catch (e: unknown) {
			if (e instanceof Error) toast.error(e.message);
			setSyncError(true);
		} finally {
			setSyncing(false);
		}
	}

	return { resync, status, syncError, syncing };
}

function AppLink({
	"aria-controls": ariaControls,
	"aria-expanded": ariaExpanded,
	children,
	className,
	href,
	onClick,
}: {
	"aria-controls"?: string;
	"aria-expanded"?: boolean;
	children: ReactNode;
	className?: string;
	href: string;
	onClick?: () => void;
}) {
	const hashAt = href.indexOf("#");
	if (hashAt >= 0) {
		const hash = href.slice(hashAt + 1);
		const to = href.slice(0, hashAt) || "/dashboard";
		return (
			<Link
				aria-controls={ariaControls}
				aria-expanded={ariaExpanded}
				className={className}
				hash={hash}
				onClick={onClick}
				to={to as LinkProps["to"]}
			>
				{children}
			</Link>
		);
	}
	return (
		<Link
			aria-controls={ariaControls}
			aria-expanded={ariaExpanded}
			className={className}
			onClick={onClick}
			to={href as LinkProps["to"]}
		>
			{children}
		</Link>
	);
}

function isActive(href: string, pathname: string, activeHref: string, exact: boolean) {
	const [path, hash] = href.split("#");
	if (path !== pathname) return false;
	if (!hash) return exact ? activeHref === path : true;
	if (!exact) return true;
	return activeHref.endsWith(`#${hash}`);
}

function useHash() {
	const routerHref = useRouterState({ select: (state) => state.location.href });
	const [browserHash, setBrowserHash] = useState("");
	useEffect(() => {
		const sync = () => setBrowserHash(window.location.hash);
		sync();
		window.addEventListener("hashchange", sync);
		return () => window.removeEventListener("hashchange", sync);
	}, []);
	const hashAt = routerHref.indexOf("#");
	const routerHash = hashAt >= 0 ? routerHref.slice(hashAt) : "";
	return routerHash || browserHash;
}

function SidebarLink({
	active,
	href,
	icon: Icon,
	label,
	onClick,
}: {
	active: boolean;
	href: string;
	icon: typeof LayoutDashboardIcon;
	label: string;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className={cn(
					"flex items-center gap-2 rounded-lg px-2 py-1.5 text-13 font-semibold transition-colors",
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
				)}
				href={href}
				onClick={onClick}
			>
				<Icon className="size-4 shrink-0" />
				<span className="truncate">{label}</span>
			</AppLink>
		</li>
	);
}

function SidebarChildLink({
	active,
	description,
	href,
	label,
	meta,
	onClick,
}: {
	active: boolean;
	description?: string;
	href: string;
	label: string;
	meta?: number;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className={cn(
					"flex items-center gap-2 rounded-md px-2 py-1 text-12 transition-colors",
					active
						? "bg-sidebar-accent font-semibold text-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
				)}
				href={href}
				onClick={onClick}
			>
				<span className="min-w-0 flex-1">
					<span className="block truncate">{label}</span>
					{description ? (
						<span className="mt-0.5 block text-10 leading-snug text-muted-foreground">
							{description}
						</span>
					) : null}
				</span>
				{meta === undefined ? null : (
					<span className="shrink-0 font-mono text-10 text-muted-foreground">{meta}</span>
				)}
			</AppLink>
		</li>
	);
}

const pageKindMeta = {
	dynamic: { icon: ZapIcon, label: "Dynamic page" },
	static: { icon: FileIcon, label: "Static page" },
	utility: { icon: FileCogIcon, label: "Utility route" },
} satisfies Record<
	WorkspacePayload["pages"][number]["kind"],
	{ icon: typeof FileIcon; label: string }
>;

const pageKindOrder = { dynamic: 1, static: 0, utility: 2 } satisfies Record<
	WorkspacePayload["pages"][number]["kind"],
	number
>;

function SidebarPageLink({
	page,
	onClick,
}: {
	onClick?: () => void;
	page: WorkspacePayload["pages"][number];
}) {
	const { icon: Icon, label } = pageKindMeta[page.kind];
	return (
		<li>
			<Link
				aria-label={`${page.route} — ${label}`}
				className="flex items-center gap-2 rounded-md px-2 py-1 text-12 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
				onClick={onClick}
				search={{ page: page.route }}
				title={`${label} · ${page.title}`}
				to="/pages"
			>
				<Icon
					aria-hidden="true"
					className={cn("size-3.5 shrink-0", page.kind === "dynamic" && "text-brand")}
				/>
				<span className="truncate font-mono">{page.route}</span>
			</Link>
		</li>
	);
}

function SidebarGroup({
	active,
	children,
	expanded,
	href,
	icon: Icon,
	id,
	label,
	onClick,
	onToggle,
}: {
	active: boolean;
	children: ReactNode;
	expanded: boolean;
	href: string;
	icon: typeof LayoutDashboardIcon;
	id: string;
	label: string;
	onClick?: () => void;
	onToggle: () => void;
}) {
	return (
		<li>
			<AppLink
				aria-controls={`sidebar-${id}`}
				aria-expanded={expanded}
				className={cn(
					"group/row flex items-center gap-2 rounded-lg px-2 py-1.5 text-13 font-semibold transition-gb hover:bg-sidebar-accent focus-visible:bg-sidebar-accent",
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
				)}
				href={href}
				onClick={() => {
					onClick?.();
					onToggle();
				}}
			>
				<Icon className="size-4 shrink-0" />
				<span className="min-w-0 flex-1 truncate">{label}</span>
				<ChevronRightIcon
					aria-hidden="true"
					className={cn(
						"size-3.5 shrink-0 transition-transform duration-300",
						expanded ? "rotate-90" : "group-hover/row:translate-x-0.5",
					)}
				/>
			</AppLink>
			<div
				aria-hidden={expanded ? undefined : true}
				className="gb-accordion"
				data-open={expanded}
				id={`sidebar-${id}`}
				inert={!expanded}
			>
				<div className="min-h-0 overflow-hidden">
					<ul className="gb-accordion-body gb-accordion-list mt-0.5 ml-3 grid gap-0.5 border-l border-sidebar-border pl-2">
						{children}
					</ul>
				</div>
			</div>
		</li>
	);
}

interface ProjectEntry {
	branch: string;
	current: boolean;
	displayPath: string;
	favicon: string | null;
	name: string;
	root: string;
}

interface BrowseFolder {
	isAstro: boolean;
	name: string;
	path: string;
}

interface BrowsePlace {
	label: string;
	path: string;
}

interface BrowseView {
	displayPath: string;
	entries: BrowseFolder[];
	isAstro: boolean;
	name: string;
	parent: string | null;
	path: string;
	places: BrowsePlace[];
	truncated: boolean;
}

const browsePlaceIcons: Record<string, typeof FolderIcon> = {
	Home: HomeIcon,
};

function WorkspaceMenu({
	onNavigate,
	workspace,
}: {
	onNavigate?: () => void;
	workspace: WorkspacePayload | null;
}) {
	const [entries, setEntries] = useState<ProjectEntry[] | null>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [switching, setSwitching] = useState<string | null>(null);
	const [view, setView] = useState<"cards" | "list">("list");
	const [mode, setMode] = useState<"browse" | "select">("select");
	const [browse, setBrowse] = useState<BrowseView | null>(null);
	const [browseError, setBrowseError] = useState<string | null>(null);
	const [browseLoading, setBrowseLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		let alive = true;
		setEntries(null);
		setSwitching(null);
		fetch("/api/cms/projects")
			.then(async (response) => ({ body: await response.json(), ok: response.ok }))
			.then(({ body, ok }) => {
				if (!alive || !ok) return;
				setEntries((body.projects ?? []) as ProjectEntry[]);
			})
			.catch(() => {
				if (alive) setEntries([]);
			});
		return () => {
			alive = false;
		};
	}, [open]);

	useEffect(() => {
		if (open) return;
		setMode("select");
		setBrowse(null);
		setBrowseError(null);
		setQuery("");
	}, [open]);

	const needle = query.trim().toLowerCase();
	const filtered = (entries ?? []).filter(
		(entry) =>
			needle.length === 0 ||
			entry.name.toLowerCase().includes(needle) ||
			entry.branch.toLowerCase().includes(needle) ||
			entry.displayPath.toLowerCase().includes(needle),
	);

	async function openFolder(target?: string) {
		setBrowseLoading(true);
		setBrowseError(null);
		try {
			const queryString = target ? `?path=${encodeURIComponent(target)}` : "";
			const response = await fetch(`/api/cms/projects/browse${queryString}`);
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Could not open folder");
			setBrowse(json as BrowseView);
		} catch (e: unknown) {
			setBrowse(null);
			setBrowseError(e instanceof Error ? e.message : "Could not open folder");
		} finally {
			setBrowseLoading(false);
		}
	}

	function startBrowse() {
		setMode("browse");
		setBrowseError(null);
		void openFolder(browse?.path);
	}

	async function switchProject(root: string) {
		if (switching !== null) return;
		setSwitching(root);
		try {
			const response = await fetch("/api/cms/projects", {
				body: JSON.stringify({ root }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Project switch failed");
			setOpen(false);
			window.location.reload();
		} catch (e: unknown) {
			setSwitching(null);
			toast.error(e instanceof Error ? e.message : "Project switch failed");
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
				className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
				onClick={() => setOpen(true)}
				type="button"
			>
				<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<BrandMark className="size-4" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-13 font-bold tracking-tight">
						{workspace?.project ?? "platipie-cms"}
					</span>
					<span className="mt-0.5 flex items-center gap-1 text-10 text-muted-foreground">
						<GitBranchIcon className="size-3 shrink-0" />
						<span className="truncate">{workspace?.branch ?? "loading…"}</span>
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
								<Button className="shrink-0" onClick={startBrowse} size="sm" variant="brand">
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
											<li key={entry.root}>
												<button
													className={cn(
														"flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors",
														switching === null ? "hover:bg-muted" : "cursor-not-allowed opacity-55",
													)}
													disabled={switching !== null}
													onClick={() => selectProject(entry)}
													title={entry.root}
													type="button"
												>
													{entry.favicon ? (
														<img
															alt=""
															className="size-8 shrink-0 rounded-md object-contain"
															src={entry.favicon}
														/>
													) : (
														<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
															<FileTextIcon className="size-3.5" />
														</span>
													)}
													<span className="min-w-0 flex-1">
														<span className="flex items-center gap-1.5">
															<span className="truncate text-13 font-semibold text-foreground">
																{entry.name}
															</span>
															{entry.current ? (
																<span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-9 font-bold text-brand uppercase">
																	Current
																</span>
															) : null}
														</span>
														<span className="block truncate font-mono text-10 text-muted-foreground">
															{entry.displayPath}
														</span>
													</span>
													<span className="flex shrink-0 items-center gap-1 font-mono text-10 text-muted-foreground">
														<GitBranchIcon className="size-3" />
														<span className="max-w-24 truncate">
															{switching === entry.root ? "switching…" : entry.branch}
														</span>
													</span>
												</button>
											</li>
										))}
									</ul>
								) : (
									<ul className="grid grid-cols-2 gap-2">
										{filtered.map((entry) => (
											<li key={entry.root}>
												<button
													className={cn(
														"flex size-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-card",
														switching === null
															? "hover:border-foreground/15 hover:shadow-soft"
															: "cursor-not-allowed opacity-55",
													)}
													disabled={switching !== null}
													onClick={() => selectProject(entry)}
													title={entry.root}
													type="button"
												>
													<span className="flex items-center justify-between gap-1.5">
														{entry.favicon ? (
															<img
																alt=""
																className="size-8 rounded-md object-contain"
																src={entry.favicon}
															/>
														) : (
															<span className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
																<FileTextIcon className="size-3.5" />
															</span>
														)}
														<span className="flex shrink-0 items-center gap-1 font-mono text-10 text-muted-foreground">
															<GitBranchIcon className="size-3" />
															<span className="max-w-24 truncate">
																{switching === entry.root ? "switching…" : entry.branch}
															</span>
														</span>
													</span>
													<span className="min-w-0">
														<span className="flex items-center gap-1.5">
															<span className="truncate text-13 font-semibold text-foreground">
																{entry.name}
															</span>
															{entry.current ? (
																<span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-9 font-bold text-brand uppercase">
																	Current
																</span>
															) : null}
														</span>
														<span className="mt-0.5 block truncate font-mono text-10 text-muted-foreground">
															{entry.displayPath}
														</span>
													</span>
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						</>
					) : (
						<>
							<div className="flex items-center gap-1.5">
								<Button
									aria-label="Back to project list"
									onClick={() => setMode("select")}
									size="icon-sm"
									variant="ghost"
								>
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
										if (browse?.parent) void openFolder(browse.parent);
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
														onClick={() => void openFolder(place.path)}
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
												<p className="mt-1 text-12 text-muted-foreground">
													Go up a level to keep looking.
												</p>
											</div>
										) : (
											<ul className="grid gap-0.5">
												{browse.entries.map((entry) => (
													<li key={entry.path}>
														<button
															className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted"
															onClick={() => void openFolder(entry.path)}
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
										<p className="p-2 text-10 text-muted-foreground">
											Showing the first 300 folders.
										</p>
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
								<Button
									disabled={!browse?.isAstro || browseLoading || switching !== null}
									onClick={addProject}
									size="sm"
								>
									{switching === browse?.path ? "Adding…" : "Add project"}
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function SidebarNav({
	collections,
	onNavigate,
	workspace,
}: {
	collections: CollectionSummary[];
	onNavigate?: () => void;
	workspace: WorkspacePayload | null;
}) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const hash = useHash();
	const activeHref = `${pathname}${hash}`;
	const [groups, setGroups] = useState<Record<string, boolean>>({});
	const pages = (workspace?.pages ?? []).toSorted(
		(a, b) => pageKindOrder[a.kind] - pageKindOrder[b.kind] || a.route.localeCompare(b.route),
	);

	function expanded(id: string, active: boolean) {
		return groups[id] ?? active;
	}

	function toggleGroup(id: string, current: boolean) {
		setGroups((previous) => ({ ...previous, [id]: !current }));
	}

	return (
		<ul className="grid gap-0.5">
			<SidebarLink
				active={pathname === "/dashboard"}
				href="/dashboard"
				icon={LayoutDashboardIcon}
				label="Dashboard"
				onClick={onNavigate}
			/>

			<SidebarGroup
				active={pathname === "/pages"}
				expanded={expanded("pages", pathname === "/pages")}
				href="/pages"
				icon={FileStackIcon}
				id="pages"
				label="Pages"
				onClick={onNavigate}
				onToggle={() => toggleGroup("pages", expanded("pages", pathname === "/pages"))}
			>
				{pages.map((page) => (
					<SidebarPageLink key={page.path} onClick={onNavigate} page={page} />
				))}
			</SidebarGroup>

			{workspace?.emailCount ? (
				<SidebarLink
					active={isActive("/components#emails", pathname, activeHref, true)}
					href="/components#emails"
					icon={MailIcon}
					label="Emails"
					onClick={onNavigate}
				/>
			) : null}

			<SidebarGroup
				active={pathname === "/content" || pathname.startsWith("/edit/")}
				expanded={expanded("content", pathname === "/content" || pathname.startsWith("/edit/"))}
				href="/content"
				icon={DatabaseIcon}
				id="content"
				label="Content"
				onClick={onNavigate}
				onToggle={() =>
					toggleGroup(
						"content",
						expanded("content", pathname === "/content" || pathname.startsWith("/edit/")),
					)
				}
			>
				{collections.map((collection) => (
					<SidebarChildLink
						active={isActive(`/content#${collection.id}`, pathname, activeHref, true)}
						href={`/content#${collection.id}`}
						key={collection.id}
						label={collection.label}
						meta={collection.count}
						onClick={onNavigate}
					/>
				))}
				{collections.length === 0 ? (
					<li className="px-2 py-1 text-12 text-muted-foreground">Loading collections…</li>
				) : null}
			</SidebarGroup>

			<SidebarLink
				active={pathname === "/assets"}
				href="/assets"
				icon={ImageIcon}
				label="Assets"
				onClick={onNavigate}
			/>

			<SidebarGroup
				active={pathname === "/components"}
				expanded={expanded("components", pathname === "/components")}
				href="/components"
				icon={ShapesIcon}
				id="components"
				label="Components"
				onClick={onNavigate}
				onToggle={() =>
					toggleGroup("components", expanded("components", pathname === "/components"))
				}
			>
				{componentLinks.map((link) => (
					<SidebarChildLink
						active={isActive(link.href, pathname, activeHref, true)}
						href={link.href}
						key={link.label}
						label={link.label}
						onClick={onNavigate}
					/>
				))}
			</SidebarGroup>

			<SidebarGroup
				active={pathname === "/design"}
				expanded={expanded("design", pathname === "/design")}
				href="/design"
				icon={PaletteIcon}
				id="design"
				label="Design"
				onClick={onNavigate}
				onToggle={() => toggleGroup("design", expanded("design", pathname === "/design"))}
			>
				{designLinks.map((link) => (
					<SidebarChildLink
						active={isActive(link.href, pathname, activeHref, true)}
						description={link.description}
						href={link.href}
						key={link.label}
						label={link.label}
						onClick={onNavigate}
					/>
				))}
			</SidebarGroup>

			<SidebarLink
				active={pathname === "/settings"}
				href="/settings"
				icon={Settings2Icon}
				label="Settings"
				onClick={onNavigate}
			/>
		</ul>
	);
}

function SidebarPanel({
	collections,
	onNavigate,
	onResync,
	syncError,
	syncStatus,
	syncing,
	workspace,
}: {
	collections: CollectionSummary[];
	onNavigate?: () => void;
	onResync: () => void;
	syncError: boolean;
	syncStatus: SyncScopeStatus[] | null;
	syncing: boolean;
	workspace: WorkspacePayload | null;
}) {
	return (
		<div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
			<div className="border-b border-sidebar-border p-2">
				<WorkspaceMenu onNavigate={onNavigate} workspace={workspace} />
			</div>
			<nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto p-2">
				<SidebarNav collections={collections} onNavigate={onNavigate} workspace={workspace} />
			</nav>
			<div className="border-t border-sidebar-border p-2">
				<SyncStatusBar
					lastSync={overallLastSync(syncStatus)}
					loading={syncStatus === null && !syncError}
					onRefresh={onResync}
					refreshing={syncing}
					stale={syncError}
				/>
			</div>
		</div>
	);
}

/**
 * Fixed application rail: workspace identity and the CMS map live at the top,
 * followed by the primary navigation. The same panel becomes a drawer below
 * the `lg` breakpoint.
 */
export function AppSidebar() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const workspace = useWorkspace();
	const routerHref = useRouterState({ select: (state) => state.location.href });
	const collections = useCollections();
	const { resync, status, syncError, syncing } = useSyncStatus();
	const handleResync = () => void resync();

	useEffect(() => {
		if (routerHref) setMobileOpen(false);
	}, [routerHref]);

	return (
		<>
			<aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
				<SidebarPanel
					collections={collections}
					onResync={handleResync}
					syncError={syncError}
					syncStatus={status}
					syncing={syncing}
					workspace={workspace}
				/>
			</aside>

			<header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-xl lg:hidden">
				<Button
					aria-label="Open navigation"
					onClick={() => setMobileOpen(true)}
					size="icon-sm"
					variant="ghost"
				>
					<MenuIcon />
				</Button>
				<BrandMark className="size-4 text-brand" />
				<span className="min-w-0 flex-1 truncate text-13 font-bold tracking-tight">
					{workspace?.project ?? "platipie-cms"}
				</span>
				<Badge className="max-w-28 gap-1 font-mono" variant="outline">
					<GitBranchIcon className="size-3 shrink-0" />
					<span className="truncate">{workspace?.branch ?? "…"}</span>
				</Badge>
			</header>

			{mobileOpen ? (
				<div className="fixed inset-0 z-50 lg:hidden">
					<button
						aria-label="Dismiss navigation"
						className="absolute inset-0 bg-scrim/40"
						onClick={() => setMobileOpen(false)}
						type="button"
					/>
					<div className="animate-gb-pop absolute inset-y-0 left-0 flex w-sidebar flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lift">
						<div className="flex h-12 shrink-0 items-center justify-end border-b border-sidebar-border px-2">
							<Button
								aria-label="Close navigation"
								onClick={() => setMobileOpen(false)}
								size="icon-sm"
								variant="ghost"
							>
								<XIcon />
							</Button>
						</div>
						<div className="min-h-0 flex-1">
							<SidebarPanel
								collections={collections}
								onNavigate={() => setMobileOpen(false)}
								onResync={handleResync}
								syncError={syncError}
								syncStatus={status}
								syncing={syncing}
								workspace={workspace}
							/>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
