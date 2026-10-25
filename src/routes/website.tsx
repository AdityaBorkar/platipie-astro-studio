import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Code2Icon,
	FileTextIcon,
	GlobeIcon,
	PanelRightIcon,
	RefreshCwIcon,
	SearchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";
import { setUiPref, useUiPref } from "#/hooks/use-ui-prefs";
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

export const Route = createFileRoute("/website")({
	component: WebsitePage,
	head: () => ({ meta: [{ title: "Website · platipie-cms" }] }),
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

function WebsitePage() {
	const search = Route.useSearch();
	const showMeta = useUiPref("showWebsiteMeta");
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

	const selectedPage = pages.find((page) => page.path === selected) ?? pages[0] ?? null;
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
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise flex flex-wrap items-end justify-between gap-5">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Website</p>
					<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">
						Pages, <span className="text-brand">kept in view.</span>
					</h1>
					<p className="gb-sub mt-3 max-w-xl text-base">
						The Astro routes under <code>src/pages</code> with parsed SEO metadata and prerender
						settings, mirrored into SQLite by the FS watcher.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button disabled={syncing} onClick={() => void resync()} size="sm" variant="outline">
						<RefreshCwIcon className="size-3.5" />
						{syncing ? "Syncing…" : "Re-sync"}
					</Button>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-1.5">
				<Badge className="font-mono" variant={workspace?.reachable ? "success" : "destructive"}>
					Project {workspace?.reachable ? "reachable" : workspace ? "missing" : "…"}
				</Badge>
				<Badge className="font-mono" variant="outline">
					{workspace?.project ?? "…"} · {workspace?.branch ?? "…"}
				</Badge>
				<Badge variant="secondary">{pages.length} pages</Badge>
				<Badge className="font-mono" variant={lastSync ? "success" : "destructive"}>
					{lastSync ? `synced ${new Date(lastSync).toLocaleString()}` : "never synced"}
				</Badge>
				<Badge variant={showMeta ? "brand" : "outline"}>
					Metadata rail {showMeta ? "on" : "off"}
				</Badge>
			</div>

			{error ? (
				<Hint title="Failed to load the website" variant="danger">
					{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
				</Hint>
			) : null}

			<div className={cn("mt-6 grid items-start gap-4", showMeta && "lg:grid-cols-app-rail")}>
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
							<Hint className="m-4" title="No pages match" variant="info">
								Try a different route or clear the filter.
							</Hint>
						) : (
							<ul className="divide-y divide-border">
								{filtered.map((page) => (
									<li key={page.path}>
										<Link
											className={cn(
												"flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
												selectedPage?.path === page.path && "bg-muted/60",
											)}
											search={{ page: page.path }}
											to="/website"
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
											<Badge className="font-mono" variant={prerenderVariant(page.prerender)}>
												{page.prerender === "unset" ? "ssr" : `pre:${page.prerender}`}
											</Badge>
											<Badge className="font-mono" variant="outline">
												{page.type}
											</Badge>
										</Link>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				{showMeta ? (
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
											className="w-fit font-mono"
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
											<span className="text-muted-foreground">Route</span>
											<span className="font-mono">{selectedPage.route}</span>
										</div>
										<div className="flex items-center justify-between gap-2">
											<span className="text-muted-foreground">Source</span>
											<span className="truncate font-mono">{selectedPage.path}</span>
										</div>
										<div className="flex items-center justify-between gap-2">
											<span className="text-muted-foreground">Type</span>
											<Badge className="font-mono" variant="outline">
												{selectedPage.type}
											</Badge>
										</div>
										<div className="flex items-center justify-between gap-2">
											<span className="text-muted-foreground">Prerender</span>
											<Badge
												className="font-mono"
												variant={prerenderVariant(selectedPage.prerender)}
											>
												{selectedPage.prerender}
											</Badge>
										</div>
										<div className="flex items-center justify-between gap-2">
											<span className="text-muted-foreground">Updated</span>
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
							<Hint title="No page selected" variant="info">
								Pick a page from the list to inspect its metadata.
							</Hint>
						)}

						<Hint title="Rail toggle" variant="warning">
							<button
								className="inline-flex items-center gap-1 font-semibold text-brand"
								onClick={() => setUiPref("showWebsiteMeta", false)}
								type="button"
							>
								<PanelRightIcon className="size-3" />
								Hide this rail
							</button>{" "}
							from Website → Show SEO / Page Metadata / Schema Markup.
						</Hint>
					</aside>
				) : null}
			</div>
		</div>
	);
}
