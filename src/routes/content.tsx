import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	Code2Icon,
	DatabaseIcon,
	FileTextIcon,
	FolderIcon,
	RefreshCwIcon,
	SearchIcon,
	SparklesIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { EmptyState, PageHeader, PageShell } from "#/components/gitbook/page";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";

interface CollectionSummary {
	count: number;
	id: string;
	label: string;
	source: string;
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

interface DbCollection {
	base: string;
	count: number;
	filePath: string;
	loader: string;
	name: string;
	pattern: string;
	schemaKeys: string;
}

interface ContentModelResponse {
	rows: DbCollection[];
	status: { fileCount: number; lastSync: number | null; scope: string }[];
}

export const Route = createFileRoute("/content")({
	component: ContentPage,
	head: () => ({ meta: [{ title: "Content · platipie-cms" }] }),
});

function ContentPage() {
	const [data, setData] = useState<CollectionsResponse | null>(null);
	const [model, setModel] = useState<DbCollection[] | null>(null);
	const [modelSync, setModelSync] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [syncing, setSyncing] = useState(false);
	const [browse, setBrowse] = useState<CollectionSummary | null>(null);
	const [browseEntries, setBrowseEntries] = useState<RecentEntry[] | null>(null);
	const [browseError, setBrowseError] = useState<string | null>(null);
	const [browseQuery, setBrowseQuery] = useState("");

	useEffect(() => {
		let alive = true;
		fetch("/api/cms/collections")
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load content");
				return json as CollectionsResponse;
			})
			.then((json) => {
				if (alive) setData(json);
			})
			.catch((e: unknown) => {
				if (alive) setError(String((e as Error).message ?? e));
			});
		fetch("/api/cms/inventory?scope=content")
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load content model");
				return json as ContentModelResponse;
			})
			.then((json) => {
				if (alive) {
					setModel(json.rows ?? []);
					setModelSync(json.status.find((entry) => entry.scope === "content")?.lastSync ?? null);
				}
			})
			.catch(() => {
				if (alive) setModel([]);
			});
		return () => {
			alive = false;
		};
	}, []);

	async function resyncModel() {
		setSyncing(true);
		try {
			const response = await fetch("/api/cms/sync", {
				body: JSON.stringify({ scope: "content" }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Re-sync failed");
			toast.success(`Content model re-synced (${json.fileCount} collections)`);
			const reload = await fetch("/api/cms/inventory?scope=content");
			const next = (await reload.json()) as ContentModelResponse;
			setModel(next.rows ?? []);
			setModelSync(next.status.find((entry) => entry.scope === "content")?.lastSync ?? null);
		} catch (e: unknown) {
			toast.error(String((e as Error).message ?? e));
		} finally {
			setSyncing(false);
		}
	}

	const totalEntries = (data?.collections ?? []).reduce(
		(sum, collection) => sum + collection.count,
		0,
	);
	const browseNeedle = browseQuery.trim().toLowerCase();
	const visibleBrowseEntries = (browseEntries ?? []).filter(
		(entry) =>
			browseNeedle.length === 0 ||
			entry.id.toLowerCase().includes(browseNeedle) ||
			(entry.title ?? "").toLowerCase().includes(browseNeedle) ||
			entry.path.toLowerCase().includes(browseNeedle),
	);

	function openCollection(collection: CollectionSummary) {
		setBrowse(collection);
		setBrowseEntries(null);
		setBrowseError(null);
		setBrowseQuery("");
		fetch(`/api/cms/entries?collection=${encodeURIComponent(collection.id)}`)
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Could not load entries");
				return json as { entries?: RecentEntry[] };
			})
			.then((json) => setBrowseEntries(json.entries ?? []))
			.catch((e: unknown) => setBrowseError(e instanceof Error ? e.message : String(e)));
	}

	return (
		<PageShell>
			<PageHeader
				description={
					<>
						The CMS collections registered against the Astro checkout. Files stay the source of
						truth; the SQLite mirror is a read-model kept fresh by the FS watcher.
					</>
				}
				eyebrow="Content"
				meta={
					<>
						<Badge
							className="font-mono"
							variant={data?.env.projectReachable ? "success" : "destructive"}
						>
							Project {data?.env.projectReachable ? "reachable" : "missing"}
						</Badge>
						<Badge variant="secondary">{totalEntries} entries</Badge>
						<Badge variant={(data?.drift.length ?? 0) > 0 ? "brand" : "success"}>
							{data?.drift.length ?? 0} drift signals
						</Badge>
					</>
				}
				title={
					<>
						Every entry, <span className="text-brand">one inbox.</span>
					</>
				}
			/>

			{error ? (
				<Hint className="mt-4" title="Failed to load content" variant="danger">
					{error}
				</Hint>
			) : null}

			<div className="mt-6 grid items-start gap-4 lg:grid-cols-app-rail">
				<div className="grid min-w-0 gap-4">
					<Card>
						<CardHeader>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<CardTitle className="flex items-center gap-2">
										<DatabaseIcon className="size-4 text-brand" />
										Content model
									</CardTitle>
									<CardDescription className="font-mono text-11">
										Parsed from src/content.config.ts — the only CMS source ·{" "}
										{modelSync ? `synced ${new Date(modelSync).toLocaleString()}` : "never synced"}
									</CardDescription>
								</div>
								<Button
									disabled={syncing}
									onClick={() => void resyncModel()}
									size="sm"
									variant="outline"
								>
									<RefreshCwIcon className="size-3.5" />
									{syncing ? "Syncing…" : "Re-sync"}
								</Button>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							{model === null ? (
								<div className="grid gap-2 p-4">
									<Skeleton className="h-9 w-full" />
									<Skeleton className="h-9 w-full" />
								</div>
							) : model.length === 0 ? (
								<Hint className="m-4" title="No content model yet" variant="info">
									Run <code>bun run sync:once</code> to parse <code>src/content.config.ts</code>{" "}
									into the SQLite mirror.
								</Hint>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="pl-5">Collection</TableHead>
											<TableHead className="hidden xl:table-cell">Loader</TableHead>
											<TableHead className="hidden xl:table-cell">Schema keys</TableHead>
											<TableHead className="text-right">Entries</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{model.map((collection) => (
											<TableRow key={collection.name}>
												<TableCell className="pl-5">
													<span className="block font-mono text-xs font-semibold">
														{collection.name}
													</span>
													<span className="block truncate font-mono text-10 text-muted-foreground">
														{collection.base || "—"} · {collection.pattern || "file"}
													</span>
												</TableCell>
												<TableCell className="hidden xl:table-cell">
													<Badge className="font-mono" variant="outline">
														{collection.loader}
													</Badge>
												</TableCell>
												<TableCell className="hidden max-w-64 truncate font-mono text-11 text-muted-foreground xl:table-cell">
													{(() => {
														try {
															const keys = JSON.parse(collection.schemaKeys) as string[];
															return keys.join(", ");
														} catch {
															return "—";
														}
													})()}
												</TableCell>
												<TableCell className="text-right font-mono text-11">
													{collection.count}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{data === null ? (
						<Skeleton className="h-64 w-full" />
					) : (
						<div className="grid gap-3 sm:grid-cols-2">
							{data.collections.map((collection) => (
								<Card className="scroll-mt-24" id={collection.id} key={collection.id}>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<FolderIcon className="size-4 text-brand" />
											{collection.label}
										</CardTitle>
										<CardDescription className="truncate font-mono text-11">
											{collection.source}
										</CardDescription>
									</CardHeader>
									<CardContent className="flex items-center justify-between gap-2">
										<Badge variant="outline">{collection.count} entries</Badge>
										<Button onClick={() => openCollection(collection)} size="sm" variant="ghost">
											Browse
											<ArrowRightIcon className="size-3.5" />
										</Button>
									</CardContent>
								</Card>
							))}
						</div>
					)}

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileTextIcon className="size-4 text-brand" />
								Recent edits
							</CardTitle>
							<CardDescription>The newest files across projects, blog, and legal.</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{data === null ? (
								<div className="grid gap-2 p-4">
									<Skeleton className="h-9 w-full" />
									<Skeleton className="h-9 w-full" />
								</div>
							) : data.recent.length === 0 ? (
								<EmptyState
									className="m-4"
									compact
									description="Open an entry from the dashboard to start the activity log."
									icon={FileTextIcon}
									title="No recent edits"
								/>
							) : (
								<ul className="divide-y divide-border">
									{data.recent.slice(0, 10).map((entry) => (
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
												<span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
													<FileTextIcon className="size-3.5" />
												</span>
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
				</div>

				<aside className="grid content-start gap-3 lg:sticky lg:top-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<SearchIcon className="size-4 text-brand" />
								SEO
							</CardTitle>
							<CardDescription>Workspace-level signals.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2">
							<Badge className="max-w-full truncate font-mono" variant="outline">
								ASTRO_URL {data?.env.astroUrl ?? "unset"}
							</Badge>
							<Badge className="w-fit" variant={data?.env.aiEnabled ? "brand" : "secondary"}>
								<SparklesIcon className="size-3" />
								AI {data?.env.aiEnabled ? "on · BYOK" : "off · heuristics"}
							</Badge>
							<p className="text-xs text-muted-foreground">
								Open any entry to see title, description, keyword, and readability checks in the
								editor&apos;s right rail.
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Code2Icon className="size-4 text-brand" />
								Schema markup
							</CardTitle>
							<CardDescription>Types accepted by the editor.</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-1">
							{["BlogPosting", "Article", "HowTo", "WebPage", "SoftwareApplication", "Review"].map(
								(type) => (
									<Badge className="font-mono" key={type} variant="outline">
										{type}
									</Badge>
								),
							)}
						</CardContent>
					</Card>

					{data && data.drift.length > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TriangleAlertIcon className="size-4 text-warning" />
									Drift
								</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-2">
								{data.drift.slice(0, 4).map((signal) => (
									<div key={signal.code}>
										<p className="font-mono text-10 font-semibold">{signal.code}</p>
										<p className="text-xs text-muted-foreground">{signal.message}</p>
									</div>
								))}
							</CardContent>
						</Card>
					) : null}
				</aside>
			</div>

			<Card className="mt-6">
				<CardContent className="flex flex-wrap items-center gap-2">
					<DatabaseIcon className="size-4 text-brand" />
					<span className="text-sm text-muted-foreground">
						{data?.collections.length ?? 0} collections · {data?.env.port ?? 4000} · trash{" "}
						{data?.env.trashTtlDays ?? 30}d
					</span>
					<Button
						className="ml-auto"
						nativeButton={false}
						render={<Link to="/settings" />}
						size="sm"
						variant="outline"
					>
						Settings
					</Button>
				</CardContent>
			</Card>

			<Dialog onOpenChange={(open) => !open && setBrowse(null)} open={browse !== null}>
				<DialogContent className="gap-3 sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{browse?.label}</DialogTitle>
						<DialogDescription className="font-mono text-11">{browse?.source}</DialogDescription>
					</DialogHeader>
					<InputGroup>
						<InputGroupAddon>
							<SearchIcon />
						</InputGroupAddon>
						<InputGroupInput
							aria-label="Filter entries"
							onChange={(event) => setBrowseQuery(event.target.value)}
							placeholder="Filter entries…"
							value={browseQuery}
						/>
					</InputGroup>
					<div className="max-h-58vh min-h-32 overflow-y-auto pr-0.5">
						{browseError ? (
							<Hint title="Could not load entries" variant="danger">
								{browseError}
							</Hint>
						) : browseEntries === null ? (
							<div className="grid gap-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : visibleBrowseEntries.length === 0 ? (
							<EmptyState
								compact
								description={
									browseQuery
										? "Try a different title or path."
										: "This collection has no entries yet."
								}
								icon={browseQuery ? SearchIcon : FileTextIcon}
								title={browseQuery ? "No entries match" : "No entries"}
							/>
						) : (
							<ul className="grid gap-0.5">
								{visibleBrowseEntries.map((entry) => (
									<li key={entry.path}>
										<Link
											className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
											params={{
												collection: browse?.id ?? "",
												id: encodeURIComponent(entry.id),
											}}
											search={{ path: entry.path }}
											to="/edit/$collection/$id"
										>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-medium">
													{entry.title ?? entry.id}
												</span>
												<span className="block truncate font-mono text-10 text-muted-foreground">
													{entry.path}
												</span>
											</span>
											<ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
										</Link>
									</li>
								))}
							</ul>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
