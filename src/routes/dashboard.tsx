import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	DatabaseIcon,
	FileStackIcon,
	FolderGit2Icon,
	GitBranchIcon,
	ImageIcon,
	RefreshCwIcon,
	ShapesIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { BrandMark } from "#/components/gitbook/brand";
import { Hint } from "#/components/gitbook/hint";
import { EmptyState, PageHeader, PageShell, SyncBadge } from "#/components/gitbook/page";
import { LiveBadge } from "#/components/live-badge";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";

interface ProjectEntry {
	branch: string;
	current: boolean;
	displayPath: string;
	favicon: string | null;
	name: string;
	root: string;
}

interface CollectionSummary {
	count: number;
	id: string;
	label: string;
}

interface RecentEntry {
	collection: string;
	id: string;
	mtime: number;
	path: string;
	title?: string;
}

interface CollectionsResponse {
	collections: CollectionSummary[];
	counts: Record<string, number>;
	drift: { code: string; hint?: string; message: string }[];
	env: {
		aiEnabled: boolean;
		astroUrl: string | null;
		port: number;
		projectReachable: boolean;
		trashTtlDays: number;
	};
	recent: RecentEntry[];
}

interface InventoryResponse {
	rows: Record<string, unknown[]>;
	status: { fileCount: number; lastSync: number | null; scope: string }[];
}

interface DashboardData {
	collections: CollectionsResponse;
	inventory: InventoryResponse;
	project: ProjectEntry | null;
}

export const Route = createFileRoute("/dashboard")({
	component: Dashboard,
	head: () => ({ meta: [{ title: "Dashboard · platipie-cms" }] }),
});

function lastSyncOf(status: InventoryResponse["status"]): number | null {
	const stamps = status.map((entry) => entry.lastSync);
	if (stamps.length === 0 || stamps.some((stamp) => stamp === null)) return null;
	return Math.min(...(stamps as number[]));
}

function Dashboard() {
	const fetchProjects = useCallback(
		() => fetchJson<{ projects: ProjectEntry[] }>("/api/cms/projects"),
		[],
	);
	const fetchCollections = useCallback(
		() => fetchJson<CollectionsResponse>("/api/cms/collections"),
		[],
	);
	const fetchInventory = useCallback(
		() => fetchJson<InventoryResponse>("/api/cms/inventory?scope=pages,assets,components"),
		[],
	);
	const projectsQuery = useCachedFetch("/api/cms/projects", fetchProjects, {
		errorMessage: "Could not refresh projects",
	});
	const collectionsQuery = useCachedFetch("/api/cms/collections", fetchCollections, {
		errorMessage: "Could not refresh collections",
	});
	const inventoryQuery = useCachedFetch(
		"/api/cms/inventory?scope=pages,assets,components",
		fetchInventory,
		{
			errorMessage: "Could not refresh inventory",
		},
	);

	const data = useMemo<DashboardData | null>(() => {
		if (!projectsQuery.data || !collectionsQuery.data || !inventoryQuery.data) return null;
		const entries = projectsQuery.data.projects ?? [];
		return {
			collections: collectionsQuery.data,
			inventory: inventoryQuery.data,
			project: entries.find((entry) => entry.current) ?? null,
		};
	}, [collectionsQuery.data, inventoryQuery.data, projectsQuery.data]);
	const refreshing =
		collectionsQuery.isRefreshing || inventoryQuery.isRefreshing || projectsQuery.isRefreshing;
	const loading =
		data === null &&
		(projectsQuery.isLoading || collectionsQuery.isLoading || inventoryQuery.isLoading);
	const loadError = projectsQuery.error ?? collectionsQuery.error ?? inventoryQuery.error;

	function refreshAll() {
		collectionsQuery.refresh();
		inventoryQuery.refresh();
		projectsQuery.refresh();
	}

	if (loadError && data === null) {
		return (
			<PageShell>
				<Hint title="Failed to load the workspace" variant="danger">
					{loadError}
				</Hint>
				<Button className="mt-4" onClick={refreshAll} size="sm" variant="outline">
					<RefreshCwIcon className="size-3.5" />
					Try again
				</Button>
			</PageShell>
		);
	}

	if (data === null || loading) {
		return (
			<PageShell>
				<div className="animate-rise flex items-center gap-4">
					<Skeleton className="size-12 rounded-lg" />
					<div className="grid gap-2">
						<Skeleton className="h-8 w-56" />
						<Skeleton className="h-5 w-36" />
					</div>
				</div>
				<div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{["pages", "content", "assets", "components"].map((key) => (
						<Skeleton className="h-32 rounded-xl" key={key} />
					))}
				</div>
			</PageShell>
		);
	}

	const { collections, project } = data;
	const pages = data.inventory.rows.pages?.length ?? 0;
	const assets = data.inventory.rows.assets?.length ?? 0;
	const components = data.inventory.rows.components?.length ?? 0;
	const totalEntries = collections.collections.reduce(
		(sum, collection) => sum + collection.count,
		0,
	);
	const lastSync = lastSyncOf(data.inventory.status);
	const reachable = project !== null && collections.env.projectReachable;

	const stats = [
		{
			detail: "Astro routes",
			href: "/pages" as const,
			icon: FileStackIcon,
			label: "Pages",
			value: pages,
		},
		{
			detail: `${collections.collections.length} collections · ${totalEntries} entries`,
			href: "/content" as const,
			icon: DatabaseIcon,
			label: "Content",
			value: totalEntries,
		},
		{
			detail: "Files in assets/",
			href: "/assets" as const,
			icon: ImageIcon,
			label: "Assets",
			value: assets,
		},
		{
			detail: "Synced surfaces",
			href: "/components" as const,
			icon: ShapesIcon,
			label: "Components",
			value: components,
		},
	];

	async function resync() {
		try {
			const response = await fetch("/api/cms/sync", {
				body: JSON.stringify({}),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Re-sync failed");
			toast.success("Workspace re-synced");
			refreshAll();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : "Re-sync failed");
		}
	}

	return (
		<PageShell>
			<PageHeader
				actions={
					<>
						<Button nativeButton={false} render={<Link to="/content" />} size="sm">
							Open content
							<ArrowRightIcon className="size-3.5" />
						</Button>
						<Button onClick={() => void resync()} size="sm" variant="outline">
							<RefreshCwIcon className="size-3.5" />
							Re-sync
						</Button>
					</>
				}
				description="Files are the source of truth. This workspace mirrors the Astro checkout into a read-model for fast, safe editing."
				eyebrow="Dashboard"
				meta={
					<>
						<Badge className="font-mono" variant={reachable ? "success" : "destructive"}>
							Project {reachable ? "reachable" : "missing"}
						</Badge>
						<Badge className="font-mono" variant="outline">
							<GitBranchIcon className="size-3" />
							{project?.branch ?? "no branch"}
						</Badge>
						<SyncBadge lastSync={lastSync} />
						<LiveBadge refreshing={refreshing} />
					</>
				}
				title={
					<>
						Workspace, <span className="text-brand">at a glance.</span>
					</>
				}
			/>

			<div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{stats.map((stat) => {
					const Icon = stat.icon;
					return (
						<Card
							className="gb-card-link h-full p-card focus-within:ring-2 focus-within:ring-ring/40"
							key={stat.label}
						>
							<Link className="flex h-full flex-1 flex-col gap-3" to={stat.href}>
								<div className="flex items-center justify-between gap-2">
									<span className="text-11 font-bold tracking-12 text-muted-foreground uppercase">
										{stat.label}
									</span>
									<Icon className="size-4 text-brand" />
								</div>
								<span className="text-3xl font-bold tracking-heading">{stat.value}</span>
								<span className="text-xs leading-relaxed text-muted-foreground">{stat.detail}</span>
							</Link>
						</Card>
					);
				})}
			</div>

			<div className="mt-4 grid items-start gap-4 lg:grid-cols-app-rail">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileStackIcon className="size-4 text-brand" />
							Recent edits
						</CardTitle>
						<CardDescription>The newest files across every collection.</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						{collections.recent.length === 0 ? (
							<EmptyState
								className="m-4"
								compact
								description="Open an entry to start the activity log."
								icon={FileStackIcon}
								title="No recent edits"
							/>
						) : (
							<ul className="divide-y divide-border">
								{collections.recent.slice(0, 6).map((entry) => (
									<li key={`${entry.collection}:${entry.path}`}>
										<Link
											className="flex items-center gap-3 px-4 py-2.5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset"
											params={{
												collection: entry.collection,
												id: encodeURIComponent(entry.id),
											}}
											search={{ path: entry.path }}
											to="/edit/$collection/$id"
										>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-medium">{entry.id}</span>
												<span className="block truncate font-mono text-10 text-muted-foreground">
													{entry.path}
												</span>
											</span>
											<Badge variant="secondary">{entry.collection}</Badge>
											<span className="font-mono text-10 text-muted-foreground">
												{new Date(entry.mtime).toLocaleDateString()}
											</span>
										</Link>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FolderGit2Icon className="size-4 text-brand" />
							Project
						</CardTitle>
						<CardDescription>Where this workspace writes.</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						<div className="flex items-center gap-3">
							{project?.favicon ? (
								<img
									alt=""
									className="size-9 rounded-lg border border-border object-contain"
									src={project.favicon}
								/>
							) : (
								<span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<BrandMark className="size-4" />
								</span>
							)}
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold">{project?.name ?? "No project"}</p>
								<p className="truncate font-mono text-10 text-muted-foreground">
									{project?.displayPath ?? "Select a project from the sidebar"}
								</p>
							</div>
						</div>
						{collections.drift.length > 0 ? (
							<div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/8 px-3 py-2 text-xs text-foreground/80">
								<TriangleAlertIcon className="mt-px size-3.5 shrink-0 text-warning" />
								<span>
									{collections.drift.length} drift{" "}
									{collections.drift.length === 1 ? "signal" : "signals"} need review in Content.
								</span>
							</div>
						) : (
							<p className="text-xs text-muted-foreground">
								No drift signals. The read-model matches the checkout.
							</p>
						)}
						<Button
							className="w-full"
							nativeButton={false}
							render={<Link to="/settings" />}
							size="sm"
							variant="outline"
						>
							Open settings
						</Button>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
