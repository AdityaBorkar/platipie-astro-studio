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

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";
import { setUiPref, useUiPref } from "#/hooks/use-ui-prefs";
import { cn } from "#/lib/utils";

interface SitePageSummary {
	dynamic: boolean;
	mtime: number;
	path: string;
	route: string;
	title: string;
	type: string;
}

interface WorkspaceResponse {
	branch: string;
	pages: SitePageSummary[];
	project: string;
	reachable: boolean;
	root: string;
}

interface SettingsResponse {
	env?: {
		astroRoot?: string;
		astroRootReachable?: boolean;
		astroUrl?: string | null;
	};
	values?: { SITE_URL?: string };
}

export const Route = createFileRoute("/website")({
	component: WebsitePage,
	head: () => ({ meta: [{ title: "Website · platipie-cms" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		page: typeof search.page === "string" ? search.page : undefined,
	}),
});

function schemaFor(page: SitePageSummary | null): string {
	if (!page) return "WebPage";
	if (page.route.startsWith("/work")) return "CreativeWork";
	if (page.route.startsWith("/blog")) return "BlogPosting";
	return "WebPage";
}

function WebsitePage() {
	const search = Route.useSearch();
	const showMeta = useUiPref("showWebsiteMeta");
	const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
	const [settings, setSettings] = useState<SettingsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<string | null>(search.page ?? null);
	const [tick, setTick] = useState(0);

	useEffect(() => {
		let alive = true;
		setError(null);
		fetch(`/api/cms/workspace?tick=${tick}`)
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load pages");
				return json as WorkspaceResponse;
			})
			.then((json) => {
				if (alive) setWorkspace(json);
			})
			.catch((e: unknown) => {
				if (alive) setError(String((e as Error).message ?? e));
			});
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

	const pages = useMemo(() => workspace?.pages ?? [], [workspace]);
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
	const schemaType = schemaFor(selectedPage);

	return (
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise flex flex-wrap items-end justify-between gap-5">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Website</p>
					<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">
						Pages, <span className="text-brand">kept in view.</span>
					</h1>
					<p className="gb-sub mt-3 max-w-xl text-base">
						The Astro routes under <code>src/pages</code>. Select a page to inspect its route,
						metadata, and schema surface.
					</p>
				</div>
				<Button onClick={() => setTick((value) => value + 1)} size="sm" variant="outline">
					<RefreshCwIcon className="size-3.5" />
					Reload
				</Button>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-1.5">
				<Badge className="font-mono" variant={workspace?.reachable ? "success" : "destructive"}>
					ASTRO_ROOT {workspace?.reachable ? "reachable" : "missing"}
				</Badge>
				<Badge className="font-mono" variant="outline">
					{workspace?.project ?? "…"} · {workspace?.branch ?? "…"}
				</Badge>
				<Badge variant="secondary">{pages.length} pages</Badge>
				<Badge variant={showMeta ? "brand" : "outline"}>
					Metadata rail {showMeta ? "on" : "off"}
				</Badge>
			</div>

			{error ? (
				<Hint title="Failed to load the website" variant="danger">
					{error}
				</Hint>
			) : null}

			<div className={cn("mt-6 grid items-start gap-4", showMeta && "lg:grid-cols-app-rail")}>
				<Card className="overflow-hidden">
					<CardHeader className="gap-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<CardTitle>Pages</CardTitle>
								<CardDescription>
									Private <code>_</code> files, API routes, and error pages are hidden.
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
						{workspace === null ? (
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
												</span>
												<span className="mt-0.5 block truncate font-mono text-11 text-muted-foreground">
													{page.route} · {page.path}
												</span>
											</span>
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
											variant={siteUrl ? "outline" : "destructive"}
										>
											SITE_URL {siteUrl || "unset"}
										</Badge>
										<p className="font-mono text-11 break-all text-muted-foreground">
											{previewUrl || "Set SITE_URL in Settings to preview the canonical URL."}
										</p>
										<Hint title="Source of truth" variant="info">
											Page-level titles and descriptions still live in the Astro file. Edit{" "}
											<code>{selectedPage.path}</code> to change them.
										</Hint>
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
										<CardDescription>Suggested JSON-LD for this route.</CardDescription>
									</CardHeader>
									<CardContent>
										<pre className="code-surface p-3 font-mono text-10 whitespace-pre-wrap">
											{JSON.stringify(
												{
													"@context": "https://schema.org",
													"@type": schemaType,
													url: previewUrl || selectedPage.route,
												},
												null,
												2,
											)}
										</pre>
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
