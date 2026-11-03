import { createFileRoute } from "@tanstack/react-router";
import { Code2Icon, FileTextIcon, GlobeIcon, SearchIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Hint } from "#/components/gitbook/hint";
import { EmptyState } from "#/components/gitbook/page";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
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
import { WorkbenchShell } from "./_workbench-shell";
import { cmsKeys } from "./cms-keys";

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
	keywords: string[];
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

interface SchemaDetail {
	context: string | null;
	encoded: string | null;
	id: string | null;
	identifier: string | null;
	keys: string[];
	kind: "dynamic" | "static" | "unknown";
	schemaType: string | null;
	snippet: string;
	sourceFile: string | null;
	type: string;
}

export const Route = createFileRoute("/pages")({
	component: PagesPage,
	head: () => ({ meta: [{ title: "Pages · platipie-astro-studio" }] }),
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
		keywords: [...detail.keywords],
		schema: detail.schemaMode === "list" ? detail.schemaTypes : [],
		title: detail.title ?? "",
	};
}

function isDirty(detail: PageDetail | null, draft: Draft | null): boolean {
	if (!detail || !draft) return false;
	if (detail.editable.title && draft.title !== (detail.title ?? "")) return true;
	if (detail.editable.description && draft.description !== (detail.description ?? "")) return true;
	if (detail.editable.keywords && !sameList(draft.keywords, detail.keywords)) {
		return true;
	}
	return detail.schemaMode === "list" && !sameList(draft.schema, detail.schemaTypes);
}

function PagesPage() {
	const search = Route.useSearch();
	const [selected, setSelected] = useState<string | null>(search.page ?? null);

	const [draft, setDraft] = useState<Draft | null>(null);
	const [detailError, setDetailError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [conflict, setConflict] = useState(false);
	const [keywordInput, setKeywordInput] = useState("");
	const [activeSchema, setActiveSchema] = useState<string | null>(null);

	const fetchInventory = useCallback(
		() => fetchJson<InventoryResponse>(cmsKeys.inventory("pages")),
		[],
	);
	const inventoryQuery = useCachedFetch(cmsKeys.inventory("pages"), fetchInventory, {
		errorMessage: "Could not refresh pages",
	});
	const inventory = inventoryQuery.data?.rows ?? null;

	useEffect(() => {
		if (search.page) setSelected(search.page);
	}, [search.page]);

	const pages = useMemo(() => inventory ?? [], [inventory]);

	const selectedPage =
		pages.find((page) => page.route === selected) ??
		pages.find((page) => page.route === "/") ??
		pages[0] ??
		null;
	const selectedPath = selectedPage?.path ?? null;

	const detailKey = selectedPath ? cmsKeys.page(selectedPath) : cmsKeys.pageDetailFallback;
	const fetchDetail = useCallback(() => {
		if (!selectedPath) return Promise.reject(new Error("No page selected"));
		return fetchJson<PageDetail>(cmsKeys.page(selectedPath));
	}, [selectedPath]);
	const detailQuery = useCachedFetch<PageDetail>(detailKey, fetchDetail, {
		enabled: selectedPath !== null,
		errorMessage: "Could not refresh page settings",
	});
	const detail = detailQuery.data;
	const detailLoading = selectedPath !== null && detail === null && detailQuery.isLoading;

	// Single reset point: any new path or fresh detail rebuilds the draft
	// unconditionally. No mirror state, no second-guessing a previous path.
	useEffect(() => {
		setDetailError(detailQuery.error);
		setSaveError(null);
		setConflict(false);
		setKeywordInput("");
		setDraft(selectedPath ? toDraft(detail) : null);
	}, [detail, detailQuery.error, selectedPath]);

	const dirty = isDirty(detail, draft);

	const refreshDetail = detailQuery.refresh;
	const refreshInventory = inventoryQuery.refresh;

	const save = useCallback(
		async (force = false) => {
			if (!detail || !draft) return;
			setSaving(true);
			setSaveError(null);
			setConflict(false);
			const seo: Record<string, unknown> = {};
			if (detail.editable.title) seo.title = draft.title;
			if (detail.editable.description) seo.description = draft.description;
			if (detail.editable.keywords) seo.keywords = draft.keywords;
			try {
				await fetchJson<SaveResponse>(cmsKeys.pageBase, {
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
				refreshDetail();
				refreshInventory();
			} catch (e: unknown) {
				const code = (e as { code?: unknown }).code;
				if (code === "CONFLICT") setConflict(true);
				const message = e instanceof Error ? e.message : String(e);
				setSaveError(message);
			} finally {
				setSaving(false);
			}
		},
		[detail, draft, refreshDetail, refreshInventory],
	);

	function addSchema(type: string) {
		const value = type.trim();
		if (!value) return;
		setDraft((current) =>
			current && !current.schema.includes(value)
				? { ...current, schema: [...current.schema, value] }
				: current,
		);
	}

	function addKeywords(raw: string) {
		const values = splitKeywords(raw);
		if (values.length === 0) return;
		setDraft((current) => {
			if (!current) return current;
			const next = [...current.keywords];
			for (const value of values) {
				if (!next.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
					next.push(value);
				}
			}
			return next.length === current.keywords.length ? current : { ...current, keywords: next };
		});
		setKeywordInput("");
	}

	function removeKeyword(keyword: string) {
		setDraft((current) =>
			current
				? { ...current, keywords: current.keywords.filter((entry) => entry !== keyword) }
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
		<>
			<WorkbenchShell
				sidebar={null}
				stage={
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
				}
				rail={
					detailLoading ? (
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
							<div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
								<Button disabled={!dirty || saving} onClick={() => void save(false)} size="sm">
									{saving ? "Saving…" : "Save"}
								</Button>
								<span className="text-11 text-muted-foreground">
									{conflict
										? "Source changed — review, then force save."
										: dirty
											? "Unsaved changes"
											: "All changes saved"}
								</span>
							</div>
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
												This page derives its title from data, so there is no{" "}
												<code>const title</code> to write.
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
										<div className="flex items-center justify-between gap-2">
											<FieldLabel htmlFor="page-seo-keywords">Keywords</FieldLabel>
											<span className="font-mono text-10 text-muted-foreground">
												{draft?.keywords.length ?? 0} keywords
											</span>
										</div>
										{(draft?.keywords.length ?? 0) > 0 ? (
											<div className="flex flex-wrap gap-1.5">
												{draft?.keywords.map((keyword) => (
													<Badge className="gap-1 pr-1 font-mono" key={keyword} variant="outline">
														{keyword}
														{detail.editable.keywords ? (
															<button
																aria-label={`Remove ${keyword}`}
																className="rounded-full p-0.5 transition-colors hover:bg-muted hover:text-destructive"
																onClick={() => removeKeyword(keyword)}
																type="button"
															>
																<XIcon className="size-3" />
															</button>
														) : null}
													</Badge>
												))}
											</div>
										) : (
											<p className="text-11 text-muted-foreground">No keywords yet.</p>
										)}
										<div className="flex gap-2">
											<Input
												disabled={!detail.editable.keywords}
												id="page-seo-keywords"
												onBlur={() => {
													if (keywordInput.trim()) addKeywords(keywordInput);
												}}
												onChange={(event) => setKeywordInput(event.target.value)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === ",") {
														event.preventDefault();
														addKeywords(keywordInput);
													} else if (
														event.key === "Backspace" &&
														keywordInput === "" &&
														(draft?.keywords.length ?? 0) > 0
													) {
														removeKeyword(draft?.keywords.at(-1) ?? "");
													}
												}}
												onPaste={(event) => {
													const text = event.clipboardData.getData("text");
													if (text.includes(",")) {
														event.preventDefault();
														addKeywords(text);
													}
												}}
												placeholder="Add keyword and press Enter"
												value={keywordInput}
											/>
											<Button
												disabled={!detail.editable.keywords || !keywordInput.trim()}
												onClick={() => addKeywords(keywordInput)}
												size="default"
												type="button"
												variant="outline"
											>
												Add
											</Button>
										</div>
									</Field>
								</FieldGroup>
								{!detail.editable.title &&
								!detail.editable.description &&
								!detail.editable.keywords ? (
									<Hint className="mt-4" title="Derived SEO" variant="info">
										This route reads SEO from entry data. Edit the collection entry instead — the
										page source has no literal consts to patch.
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
										<div className="mt-3 grid justify-items-start gap-1.5">
											{(detail.schemaMode === "list"
												? (draft?.schema ?? [])
												: detail.schemaTypes
											).map((type) => (
												<Badge
													className="max-w-full gap-1 pr-1 font-mono"
													key={type}
													variant="outline"
												>
													<button
														className="min-w-0 flex-1 cursor-pointer truncate text-left hover:underline"
														onClick={() => setActiveSchema(type)}
														title={`View ${type} schema`}
														type="button"
													>
														{type}
													</button>
													{detail.editable.schema ? (
														<button
															aria-label={`Remove ${type}`}
															className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-muted hover:text-destructive"
															onClick={(event) => {
																event.stopPropagation();
																removeSchema(type);
															}}
															onKeyDown={(event) => event.stopPropagation()}
															type="button"
														>
															<XIcon className="size-3" />
														</button>
													) : null}
												</Badge>
											))}
											{detail.schemaMode === "list" && (draft?.schema.length ?? 0) === 0 ? (
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
												Built with <code>SchemaMarkup.generate()</code>. Edit the generator inputs
												in the page source.
											</Hint>
										)}
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
											<Badge
												className="font-mono"
												variant={detail.prerender === "true" ? "success" : "secondary"}
											>
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
					)
				}
			/>
			{activeSchema ? (
				<SchemaDialog onClose={() => setActiveSchema(null)} type={activeSchema} />
			) : null}
		</>
	);
}

function SchemaDialog({ onClose, type }: { onClose: () => void; type: string }) {
	const fetchSchema = useCallback(() => fetchJson<SchemaDetail>(cmsKeys.schema(type)), [type]);
	const schemaQuery = useCachedFetch(cmsKeys.schema(type), fetchSchema, {
		errorMessage: "Could not load schema",
		toastOnBackgroundError: false,
	});
	const schemaDetail = schemaQuery.data;

	return (
		<Dialog onOpenChange={(open) => !open && onClose()} open>
			<DialogContent className="gap-3 sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="font-mono">{type}</DialogTitle>
					<DialogDescription>
						{schemaDetail?.sourceFile ?? "Schema markup encoded for this page"}
					</DialogDescription>
				</DialogHeader>
				{schemaQuery.isLoading ? (
					<div className="grid gap-2">
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-40 w-full" />
					</div>
				) : schemaQuery.error && !schemaDetail ? (
					<Hint title="Could not load schema" variant="danger">
						{schemaQuery.error}
					</Hint>
				) : schemaDetail ? (
					<div className="grid gap-3">
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge className="font-mono" variant="outline">
								{schemaDetail.kind}
							</Badge>
							{schemaDetail.schemaType ? (
								<Badge className="font-mono" variant="secondary">
									{schemaDetail.schemaType}
								</Badge>
							) : null}
						</div>
						{schemaDetail.id ? (
							<p className="truncate font-mono text-11 text-muted-foreground">{schemaDetail.id}</p>
						) : null}
						<p className="font-mono text-11 break-all">
							<code>{schemaDetail.snippet}</code>
						</p>
						{schemaDetail.encoded ? (
							<pre className="max-h-58vh overflow-auto rounded-xl border border-border/70 bg-muted/30 p-3 font-mono text-11 break-all whitespace-pre-wrap">
								{schemaDetail.encoded}
							</pre>
						) : (
							<p className="text-xs text-muted-foreground">
								No encoded JSON-LD found for this type yet.
							</p>
						)}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
