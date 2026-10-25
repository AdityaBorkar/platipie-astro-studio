import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Code2Icon,
	FileTextIcon,
	GlobeIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	SaveIcon,
	SearchIcon,
	XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { EmptyState, SyncBadge } from "#/components/gitbook/page";
import { LiveBadge } from "#/components/live-badge";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Textarea } from "#/components/ui/textarea";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
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

interface PageDetail {
	description: string | null;
	editable: { description: boolean; keywords: boolean; schema: boolean; title: boolean };
	keywords: string[];
	mtime: number;
	options: string[];
	path: string;
	prerender: string;
	route: string;
	schemaMode: "dynamic" | "list" | "none";
	schemaTypes: string[];
	title: string | null;
}

interface Draft {
	description: string;
	keywords: string;
	schema: string[];
	title: string;
}

interface SaveResponse {
	code?: string;
	diff?: string;
	message?: string;
	mtime: number;
	path: string;
}

export const Route = createFileRoute("/pages")({
	component: PagesPage,
	head: () => ({ meta: [{ title: "Pages · platipie-cms" }] }),
	validateSearch: (search: Record<string, unknown>) => ({
		page: typeof search.page === "string" ? search.page : undefined,
	}),
});

function splitKeywords(raw: string): string[] {
	return raw
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function sameList(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

function toDraft(detail: PageDetail | null): Draft | null {
	if (!detail) return null;
	return {
		description: detail.description ?? "",
		keywords: detail.keywords.join(", "),
		schema: detail.schemaMode === "list" ? detail.schemaTypes : [],
		title: detail.title ?? "",
	};
}

function isDirty(detail: PageDetail | null, draft: Draft | null): boolean {
	if (!detail || !draft) return false;
	if (detail.editable.title && draft.title !== (detail.title ?? "")) return true;
	if (detail.editable.description && draft.description !== (detail.description ?? "")) return true;
	if (detail.editable.keywords && !sameList(splitKeywords(draft.keywords), detail.keywords)) {
		return true;
	}
	return detail.schemaMode === "list" && !sameList(draft.schema, detail.schemaTypes);
}

function prerenderVariant(prerender: string): "secondary" | "success" {
	return prerender === "true" ? "success" : "secondary";
}

function PagesPage() {
	const search = Route.useSearch();
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<string | null>(search.page ?? null);
	const [syncing, setSyncing] = useState(false);

	const [draft, setDraft] = useState<Draft | null>(null);
	const [detailError, setDetailError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [conflict, setConflict] = useState(false);
	const [detailPath, setDetailPath] = useState<string | null>(null);

	const fetchInventory = useCallback(
		() => fetchJson<InventoryResponse>("/api/cms/inventory?scope=pages"),
		[],
	);
	const fetchWorkspace = useCallback(() => fetchJson<WorkspaceResponse>("/api/cms/workspace"), []);
	const fetchSettings = useCallback(() => fetchJson<SettingsResponse>("/api/cms/settings"), []);
	const inventoryQuery = useCachedFetch("/api/cms/inventory?scope=pages", fetchInventory, {
		errorMessage: "Could not refresh pages",
	});
	const workspaceQuery = useCachedFetch("/api/cms/workspace", fetchWorkspace, {
		errorMessage: "Could not refresh workspace",
		toastOnBackgroundError: false,
	});
	const settingsQuery = useCachedFetch("/api/cms/settings", fetchSettings, {
		errorMessage: "Could not refresh settings",
		toastOnBackgroundError: false,
	});
	const inventory = inventoryQuery.data?.rows ?? null;
	const lastSync =
		inventoryQuery.data?.status.find((entry) => entry.scope === "pages")?.lastSync ?? null;
	const workspace = workspaceQuery.data;
	const settings = settingsQuery.data;
	const error = inventory === null ? inventoryQuery.error : null;

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
	const selectedPath = selectedPage?.path ?? null;
	const siteUrl = settings?.values?.SITE_URL?.replace(/\/$/u, "") ?? "";
	const previewUrl = selectedPage ? `${siteUrl}${selectedPage.route}` : siteUrl;

	const detailKey = selectedPath ? `/api/cms/page?path=${encodeURIComponent(selectedPath)}` : null;
	const fetchDetail = useCallback(() => {
		if (!selectedPath) return Promise.reject(new Error("No page selected"));
		return fetchJson<PageDetail>(`/api/cms/page?path=${encodeURIComponent(selectedPath)}`);
	}, [selectedPath]);
	const detailQuery = useCachedFetch<PageDetail>(detailKey ?? "pages:detail:none", fetchDetail, {
		enabled: selectedPath !== null,
		errorMessage: "Could not refresh page settings",
	});
	const detail = detailQuery.data;
	const detailLoading = selectedPath !== null && detail === null && detailQuery.isLoading;
	const detailRefreshing = detail !== null && detailQuery.isRefreshing;

	useEffect(() => {
		if (detailQuery.error && detail === null) {
			setDetailError(detailQuery.error);
		} else if (detail !== null) {
			setDetailError(null);
		}
	}, [detail, detailQuery.error]);

	useEffect(() => {
		if (!selectedPath) {
			setDraft(null);
			setDetailError(null);
			setDetailPath(null);
			return;
		}
		if (detailPath !== selectedPath) {
			setDetailError(null);
			setSaveError(null);
			setConflict(false);
			setDetailPath(selectedPath);
			setDraft(toDraft(detail));
			return;
		}
		if (detail && draft === null) {
			setDraft(toDraft(detail));
		}
	}, [detail, detailPath, draft, selectedPath]);

	const dirty = isDirty(detail, draft);

	async function resync() {
		setSyncing(true);
		try {
			const json = await fetchJson<{ fileCount: number }>("/api/cms/sync", {
				body: JSON.stringify({ scope: "pages" }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			toast.success(`Re-synced ${json.fileCount} pages`);
			inventoryQuery.refresh();
			detailQuery.refresh();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			setSyncing(false);
		}
	}

	async function save(force = false) {
		if (!detail || !draft) return;
		setSaving(true);
		setSaveError(null);
		setConflict(false);
		const seo: Record<string, unknown> = {};
		if (detail.editable.title) seo.title = draft.title;
		if (detail.editable.description) seo.description = draft.description;
		if (detail.editable.keywords) seo.keywords = splitKeywords(draft.keywords);
		try {
			const json = await fetchJson<SaveResponse>("/api/cms/page", {
				body: JSON.stringify({
					force,
					mtime: detail.mtime,
					path: detail.path,
					schema: detail.editable.schema ? draft.schema : undefined,
					seo,
				}),
				headers: { "Content-Type": "application/json" },
				method: "PUT",
			});
			toast.success(`Saved ${json.path}`);
			detailQuery.refresh();
			inventoryQuery.refresh();
		} catch (e: unknown) {
			const code = (e as { code?: unknown }).code;
			if (code === "CONFLICT") setConflict(true);
			const message = e instanceof Error ? e.message : String(e);
			setSaveError(message);
		} finally {
			setSaving(false);
		}
	}

	function addSchema(type: string) {
		const value = type.trim();
		if (!value) return;
		setDraft((current) =>
			current && !current.schema.includes(value)
				? { ...current, schema: [...current.schema, value] }
				: current,
		);
	}

	function removeSchema(type: string) {
		setDraft((current) =>
			current ? { ...current, schema: current.schema.filter((entry) => entry !== type) } : current,
		);
	}

	const schemaOptions = useMemo(
		() => (detail?.options ?? []).filter((option) => !(draft?.schema ?? []).includes(option)),
		[detail, draft],
	);

	return (
		<div className="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-pages-workspace lg:overflow-hidden">
			<aside className="flex min-h-0 flex-col border-border/70 bg-sidebar/50 lg:border-r">
				<div className="border-b border-border/70 p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="text-11 font-bold tracking-14 text-brand uppercase">Pages</p>
							<h1 className="mt-1 text-title font-bold tracking-heading">Routes</h1>
						</div>
						<Button
							aria-label="Re-sync pages"
							disabled={syncing}
							onClick={() => void resync()}
							size="sm"
							variant="outline"
						>
							<RefreshCwIcon className={cn("size-3.5", syncing && "animate-spin")} />
							{syncing ? "Syncing…" : "Re-sync"}
						</Button>
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-1.5">
						<Badge className="font-mono" variant={workspace?.reachable ? "success" : "destructive"}>
							{workspace?.reachable ? "reachable" : workspace ? "missing" : "…"}
						</Badge>
						<Badge variant="secondary">{pages.length} pages</Badge>
						<SyncBadge lastSync={lastSync} />
						<LiveBadge refreshing={inventoryQuery.isRefreshing} />
					</div>
					<InputGroup className="mt-3 w-full">
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

				<div className="max-h-45dvh min-h-0 overflow-y-auto lg:max-h-none lg:flex-1">
					{error ? (
						<div className="p-4">
							<Hint title="Failed to load pages" variant="danger">
								{error}
							</Hint>
						</div>
					) : inventory === null ? (
						<div className="grid gap-2 p-4">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : filtered.length === 0 ? (
						<EmptyState
							className="m-3"
							compact
							description="Try a different route or clear the filter."
							icon={SearchIcon}
							title="No pages match"
						/>
					) : (
						<ul className="divide-y divide-border/70">
							{filtered.map((page) => (
								<li key={page.path}>
									<Link
										className={cn(
											"flex items-center gap-2.5 px-4 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset",
											selectedPage?.path === page.path && "bg-muted/70",
										)}
										search={{ page: page.route }}
										to="/pages"
									>
										<span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
											<GlobeIcon className="size-3.5" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="flex items-center gap-1.5">
												<span className="truncate text-sm font-semibold">{page.title}</span>
												{page.dynamic ? <Badge variant="brand">dynamic</Badge> : null}
											</span>
											<span className="mt-0.5 block truncate font-mono text-11 text-muted-foreground">
												{page.route}
											</span>
										</span>
										<Badge
											className="font-mono"
											variant={page.prerender === "true" ? "success" : "outline"}
										>
											{page.prerender === "true" ? "pre" : "ssr"}
										</Badge>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="hidden border-t border-border/70 px-4 py-3 lg:block">
					<p className="truncate font-mono text-11 text-muted-foreground">
						{workspace?.project ?? "…"} · {workspace?.branch ?? "…"}
					</p>
				</div>
			</aside>

			<section className="hidden min-h-0 flex-col lg:flex">
				<div className="flex items-center gap-3 border-b border-border/70 px-5 py-3">
					<div className="flex items-center gap-1.5 text-muted-foreground">
						<span className="size-2.5 rounded-full bg-border" />
						<span className="size-2.5 rounded-full bg-border" />
						<span className="size-2.5 rounded-full bg-border" />
					</div>
					<div className="min-w-0 flex-1 rounded-full border border-border/70 bg-card px-3 py-1.5">
						<p className="truncate font-mono text-11 text-muted-foreground">
							{siteUrl ? previewUrl : (selectedPage?.route ?? "Select a page")}
						</p>
					</div>
					<Badge variant="outline">preview reserved</Badge>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-5">
					<div className="grid h-full min-h-80 place-items-center rounded-2xl border border-dashed border-border/80 bg-muted/25 p-8 text-center">
						<div className="max-w-sm">
							<span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-card text-brand shadow-soft">
								<GlobeIcon className="size-5" />
							</span>
							<p className="mt-4 text-title font-bold tracking-heading">Webpage preview</p>
							<p className="gb-sub mt-1.5 text-sm">
								This canvas is reserved for the live {selectedPage?.route ?? "page"} preview. The
								layout already owns the space; the renderer lands next.
							</p>
							<div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1 font-mono text-11 text-muted-foreground">
								<FileTextIcon className="size-3" />
								{selectedPage?.path ?? "No source selected"}
							</div>
						</div>
					</div>
				</div>
			</section>

			<aside className="min-h-0 border-border/70 lg:h-dvh lg:overflow-y-auto lg:border-l lg:bg-sidebar/50">
				<div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur">
					<div className="min-w-0">
						<p className="text-11 font-bold tracking-14 text-brand uppercase">Page settings</p>
						<p className="truncate text-sm font-semibold">
							{selectedPage?.title ?? "No page selected"}
						</p>
						<LiveBadge refreshing={detailRefreshing} />
					</div>
					<div className="flex shrink-0 items-center gap-1">
						{dirty ? (
							<Button
								aria-label="Reset changes"
								disabled={saving}
								onClick={() => setDraft(toDraft(detail))}
								size="icon-sm"
								variant="ghost"
							>
								<RotateCcwIcon className="size-3.5" />
							</Button>
						) : null}
						<Button
							disabled={!dirty || saving || !detail}
							onClick={() => void save(false)}
							size="sm"
						>
							<SaveIcon className="size-3.5" />
							{saving ? "Saving…" : "Save"}
						</Button>
					</div>
				</div>

				{detailLoading ? (
					<div className="grid gap-2 p-4">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
				) : detailError ? (
					<div className="p-4">
						<Hint title="Failed to load page metadata" variant="danger">
							{detailError}
						</Hint>
					</div>
				) : detail ? (
					<>
						{saveError ? (
							<div className="grid gap-2 p-4 pb-0">
								<Hint title={conflict ? "Stale file" : "Save failed"} variant="danger">
									{saveError}
								</Hint>
								{conflict ? (
									<Button
										className="justify-self-start"
										onClick={() => void save(true)}
										size="sm"
										variant="outline"
									>
										Force save
									</Button>
								) : null}
							</div>
						) : null}

						<section className="border-b border-border/70 px-4 py-5">
							<div className="flex items-center gap-2">
								<SearchIcon className="size-4 text-brand" />
								<h2 className="text-sm font-bold tracking-heading">SEO</h2>
							</div>
							<FieldGroup className="mt-4 gap-4">
								<Field data-invalid={!detail.editable.title}>
									<div className="flex items-center justify-between gap-2">
										<FieldLabel htmlFor="page-seo-title">Meta title</FieldLabel>
										<span className="font-mono text-10 text-muted-foreground">
											{draft?.title.length ?? 0}/60
										</span>
									</div>
									<Input
										disabled={!detail.editable.title}
										id="page-seo-title"
										onChange={(event) =>
											setDraft((current) =>
												current ? { ...current, title: event.target.value } : current,
											)
										}
										placeholder={
											detail.editable.title ? "Page title" : "Not defined as a const in source"
										}
										value={draft?.title ?? ""}
									/>
									{detail.editable.title ? null : (
										<p className="text-11 text-muted-foreground">
											This page derives its title from data, so there is no <code>const title</code>{" "}
											to write.
										</p>
									)}
								</Field>

								<Field data-invalid={!detail.editable.description}>
									<div className="flex items-center justify-between gap-2">
										<FieldLabel htmlFor="page-seo-description">Meta description</FieldLabel>
										<span className="font-mono text-10 text-muted-foreground">
											{draft?.description.length ?? 0}/160
										</span>
									</div>
									<Textarea
										disabled={!detail.editable.description}
										id="page-seo-description"
										onChange={(event) =>
											setDraft((current) =>
												current ? { ...current, description: event.target.value } : current,
											)
										}
										placeholder={
											detail.editable.description
												? "Search result description"
												: "Not defined as a const in source"
										}
										rows={4}
										value={draft?.description ?? ""}
									/>
								</Field>

								<Field data-invalid={!detail.editable.keywords}>
									<FieldLabel htmlFor="page-seo-keywords">Keywords</FieldLabel>
									<Input
										disabled={!detail.editable.keywords}
										id="page-seo-keywords"
										onChange={(event) =>
											setDraft((current) =>
												current ? { ...current, keywords: event.target.value } : current,
											)
										}
										placeholder="Comma-separated keywords"
										value={draft?.keywords ?? ""}
									/>
									<p className="text-11 text-muted-foreground">
										Comma-separated. Writes back into the <code>keywords</code> array.
									</p>
								</Field>
							</FieldGroup>
							{!detail.editable.title &&
							!detail.editable.description &&
							!detail.editable.keywords ? (
								<Hint className="mt-4" title="Derived SEO" variant="info">
									This route reads SEO from entry data. Edit the collection entry instead — the page
									source has no literal consts to patch.
								</Hint>
							) : null}
						</section>

						<section className="border-b border-border/70 px-4 py-5">
							<div className="flex items-center gap-2">
								<Code2Icon className="size-4 text-brand" />
								<h2 className="text-sm font-bold tracking-heading">Schema Markup</h2>
							</div>
							{detail.schemaMode === "none" ? (
								<p className="mt-3 text-xs text-muted-foreground">
									No <code>schema_markup</code> declaration in this page.
								</p>
							) : (
								<>
									<div className="mt-3 flex flex-wrap gap-1.5">
										{draft?.schema.map((type) => (
											<Badge className="gap-1 pr-1 font-mono" key={type} variant="outline">
												{type}
												{detail.editable.schema ? (
													<button
														aria-label={`Remove ${type}`}
														className="rounded-full p-0.5 transition-colors hover:bg-muted hover:text-destructive"
														onClick={() => removeSchema(type)}
														type="button"
													>
														<XIcon className="size-3" />
													</button>
												) : null}
											</Badge>
										))}
										{detail.schemaMode === "list" && detail.schemaTypes.length === 0 ? (
											<p className="text-xs text-muted-foreground">No schema types selected.</p>
										) : null}
									</div>
									{detail.editable.schema ? (
										<Select onValueChange={(value) => value && addSchema(value)} value="">
											<SelectTrigger className="mt-3 w-full">
												<SelectValue placeholder="Add a schema type…" />
											</SelectTrigger>
											<SelectContent>
												{schemaOptions.map((option) => (
													<SelectItem key={option} value={option}>
														{option}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<Hint className="mt-3" title="Dynamic schema" variant="info">
											Built with <code>SchemaMarkup.generate()</code>. Edit the generator inputs in
											the page source.
										</Hint>
									)}
									<p className="mt-2 text-11 text-muted-foreground">
										Saved as <code>SchemaMarkup.get(&quot;…&quot;)</code> in the route file.
									</p>
								</>
							)}
						</section>

						<section className="px-4 py-5">
							<div className="flex items-center gap-2">
								<FileTextIcon className="size-4 text-brand" />
								<h2 className="text-sm font-bold tracking-heading">Page metadata</h2>
								<Badge className="ml-auto" variant="outline">
									read-only
								</Badge>
							</div>
							<dl className="mt-4 grid gap-3 text-xs">
								<div className="grid grid-cols-page-meta items-start gap-2">
									<dt className="text-muted-foreground">File path</dt>
									<dd className="font-mono break-all">{detail.path}</dd>
								</div>
								<div className="grid grid-cols-page-meta items-start gap-2">
									<dt className="text-muted-foreground">Route</dt>
									<dd className="font-mono break-all">{detail.route}</dd>
								</div>
								<div className="grid grid-cols-page-meta items-center gap-2">
									<dt className="text-muted-foreground">Prerender</dt>
									<dd>
										<Badge className="font-mono" variant={prerenderVariant(detail.prerender)}>
											{detail.prerender === "true" ? "Yes" : "No"}
										</Badge>
									</dd>
								</div>
							</dl>
						</section>
					</>
				) : (
					<div className="p-4">
						<EmptyState
							compact
							description="Pick a page from the list to edit its SEO."
							icon={FileTextIcon}
							title="No page selected"
						/>
					</div>
				)}
			</aside>
		</div>
	);
}
