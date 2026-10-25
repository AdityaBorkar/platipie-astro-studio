import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2Icon, FileTextIcon, GlobeIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { EmptyState, PageHeader, PageShell, SyncBadge } from "#/components/gitbook/page";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

interface DbPage {
	dynamic: number;
	hasSeo: number;
	mtime: number;
	path: string;
	prerender: string;
	private: number;
	route: string;
	schemaTypes: string;
	seoDescription: string | null;
	seoKeywords: string;
	seoTitle: string | null;
	size: number;
	title: string;
	type: string;
}

interface InventoryResponse {
	rows: DbPage[];
	status: { fileCount: number; lastSync: number | null; scope: string }[];
}

interface WorkspaceResponse {
	branch: string;
	project: string;
	reachable: boolean;
}

interface SettingsResponse {
	values?: { SITE_URL?: string };
}

export const Route = createFileRoute("/pages")({
	component: PagesPage,
	head: () => ({ meta: [{ title: "Pages · platipie-cms" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		page: typeof search.page === "string" ? search.page : undefined,
	}),
});

function parseList(raw: string): string[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch {
		return [];
	}
}

function prerenderVariant(prerender: string): "success" | "secondary" | "outline" {
	if (prerender === "true") return "success";
	if (prerender === "false") return "secondary";
	return "outline";
}

function PagesPage() {
	const search = Route.useSearch();
	const [inventory, setInventory] = useState<DbPage[] | null>(null);
	const [lastSync, setLastSync] = useState<number | null>(null);
	const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
	const [settings, setSettings] = useState<SettingsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<string | null>(search.page ?? null);
	const [tick, setTick] = useState(0);
	const [syncing, setSyncing] = useState(false);

	useEffect(() => {
		let alive = true;
		setError(null);
		fetch(`/api/cms/inventory?scope=pages&tick=${tick}`)
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load pages");
				return json as InventoryResponse;
			})
			.then((json) => {
				if (alive) {
					setInventory(json.rows ?? []);
					setLastSync(json.status.find((entry) => entry.scope === "pages")?.lastSync ?? null);
				}
			})
			.catch((e: unknown) => {
				if (alive) setError(String((e as Error).message ?? e));
			});
		fetch("/api/cms/workspace")
			.then((response) => response.json())
			.then((json: WorkspaceResponse) => {
				if (alive) setWorkspace(json);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [tick]);

	useEffect(() => {
		let alive = true;
		fetch("/api/cms/settings")
			.then((response) => response.json())
			.then((json: SettingsResponse) => {
				if (alive) setSettings(json);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		if (search.page) setSelected(search.page);
	}, [search.page]);

	const pages = useMemo(() => inventory ?? [], [inventory]);
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return pages;
		return pages.filter(
			(page) =>
				page.route.toLowerCase().includes(needle) ||
				page.path.toLowerCase().includes(needle) ||
				page.title.toLowerCase().includes(needle),
		);
	}, [pages, query]);

	const selectedPage =
		pages.find((page) => page.route === selected) ??
		pages.find((page) => page.route === "/") ??
		pages[0] ??
		null;
	const siteUrl = settings?.values?.SITE_URL?.replace(/\/$/u, "") ?? "";
	const previewUrl = selectedPage ? `${siteUrl}${selectedPage.route}` : siteUrl;
	const selectedKeywords = selectedPage ? parseList(selectedPage.seoKeywords) : [];
	const selectedSchema = selectedPage ? parseList(selectedPage.schemaTypes) : [];

	async function resync() {
		setSyncing(true);
		try {
			const response = await fetch("/api/cms/sync", {
				body: JSON.stringify({ scope: "pages" }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Re-sync failed");
			toast.success(`Re-synced ${json.fileCount} pages`);
			setTick((value) => value + 1);
		} catch (e: unknown) {
			toast.error(String((e as Error).message ?? e));
		} finally {
			setSyncing(false);
		}
	}

	return (
		<PageShell>
			<PageHeader
				actions={
					<Button disabled={syncing} onClick={() => void resync()} size="sm" variant="outline">
						<RefreshCwIcon className="size-3.5" />
						{syncing ? "Syncing…" : "Re-sync"}
					</Button>
				}
				description={
					<>
						The Astro routes under <code>src/pages</code> with parsed SEO metadata and prerender
						settings, mirrored into SQLite by the FS watcher.
					</>
				}
				eyebrow="Pages"
				meta={
					<>
						<Badge className="font-mono" variant={workspace?.reachable ? "success" : "destructive"}>
							Project {workspace?.reachable ? "reachable" : workspace ? "missing" : "…"}
						</Badge>
						<Badge className="font-mono" variant="outline">
							{workspace?.project ?? "…"} · {workspace?.branch ?? "…"}
						</Badge>
						<Badge variant="secondary">{pages.length} pages</Badge>
						<SyncBadge lastSync={lastSync} />
					</>
				}
				title={
					<>
						Pages, <span className="text-brand">kept in view.</span>
					</>
				}
			/>

			{error ? (
				<Hint className="mt-4" title="Failed to load pages" variant="danger">
					{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
				</Hint>
			) : null}

			<div className="mt-6 grid items-start gap-4 lg:grid-cols-app-rail">
				<Card className="overflow-hidden">
					<CardHeader className="gap-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<CardTitle>Pages</CardTitle>
								<CardDescription>
									Every file under <code>src/pages</code> — private <code>_</code> partials and API
									routes are flagged, not hidden.
								</CardDescription>
							</div>
							<InputGroup className="w-full max-w-64">
								<InputGroupAddon>
									<SearchIcon />
								</InputGroupAddon>
								<InputGroupInput
									aria-label="Filter pages"
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Filter routes…"
									value={query}
								/>
							</InputGroup>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{inventory === null ? (
							<div className="grid gap-2 p-4">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : filtered.length === 0 ? (
							<EmptyState
								className="m-4"
								compact
								description="Try a different route or clear the filter."
								icon={SearchIcon}
								title="No pages match"
							/>
						) : (
							<ul className="divide-y divide-border">
								{filtered.map((page) => (
									<li key={page.path}>
										<Link
											className={cn(
												"flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset",
												selectedPage?.route === page.route && "bg-muted/60",
											)}
											search={{ page: page.route }}
											to="/pages"
										>
											<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
												<GlobeIcon className="size-4" />
											</span>
											<span className="min-w-0 flex-1">
												<span className="flex items-center gap-2">
													<span className="truncate text-sm font-semibold">{page.title}</span>
													{page.dynamic ? <Badge variant="brand">dynamic</Badge> : null}
													{page.private ? <Badge variant="outline">private</Badge> : null}
												</span>
												<span className="mt-0.5 block truncate font-mono text-11 text-muted-foreground">
													{page.route} · {page.path}
												</span>
											</span>
											<Badge
												className="hidden font-mono xl:inline-flex"
												variant={prerenderVariant(page.prerender)}
											>
												{page.prerender === "unset" ? "ssr" : `pre:${page.prerender}`}
											</Badge>
											<Badge className="hidden font-mono xl:inline-flex" variant="outline">
												{page.type}
											</Badge>
										</Link>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<aside className="grid content-start gap-3 lg:sticky lg:top-6">
					{selectedPage ? (
						<>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<SearchIcon className="size-4 text-brand" />
										SEO
									</CardTitle>
									<CardDescription>{selectedPage.route}</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-2">
									<Badge
										className="max-w-full truncate font-mono"
										title={selectedPage.seoTitle ?? undefined}
										variant={selectedPage.seoTitle ? "success" : "destructive"}
									>
										{selectedPage.seoTitle ?? "no title parsed"}
									</Badge>
									<p className="text-xs text-muted-foreground">
										{selectedPage.seoDescription ?? "No description const parsed from the page."}
									</p>
									{selectedKeywords.length > 0 ? (
										<div className="flex flex-wrap gap-1">
											{selectedKeywords.slice(0, 12).map((keyword) => (
												<Badge className="font-mono" key={keyword} variant="outline">
													{keyword}
												</Badge>
											))}
										</div>
									) : null}
									<p className="font-mono text-11 break-all text-muted-foreground">
										{previewUrl || "Set SITE_URL in Settings to preview the canonical URL."}
									</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<FileTextIcon className="size-4 text-brand" />
										Page metadata
									</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-1.5 text-xs">
									<div className="flex items-center justify-between gap-2">
										<span className="shrink-0 text-muted-foreground">Route</span>
										<span className="min-w-0 truncate font-mono">{selectedPage.route}</span>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="shrink-0 text-muted-foreground">Source</span>
										<span className="min-w-0 truncate font-mono" title={selectedPage.path}>
											{selectedPage.path}
										</span>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="shrink-0 text-muted-foreground">Type</span>
										<Badge className="font-mono" variant="outline">
											{selectedPage.type}
										</Badge>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="shrink-0 text-muted-foreground">Prerender</span>
										<Badge className="font-mono" variant={prerenderVariant(selectedPage.prerender)}>
											{selectedPage.prerender}
										</Badge>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="shrink-0 text-muted-foreground">Updated</span>
										<span className="font-mono">
											{new Date(selectedPage.mtime).toLocaleDateString()}
										</span>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Code2Icon className="size-4 text-brand" />
										Schema markup
									</CardTitle>
									<CardDescription>Types referenced by this page.</CardDescription>
								</CardHeader>
								<CardContent>
									{selectedSchema.length === 0 ? (
										<p className="text-xs text-muted-foreground">
											No <code>SchemaMarkup</code> references parsed.
										</p>
									) : (
										<div className="flex flex-wrap gap-1">
											{selectedSchema.map((type) => (
												<Badge className="font-mono" key={type} variant="outline">
													{type}
												</Badge>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</>
					) : (
						<EmptyState
							compact
							description="Pick a page from the list to inspect its metadata."
							icon={FileTextIcon}
							title="No page selected"
						/>
					)}
				</aside>
			</div>
		</PageShell>
	);
}
