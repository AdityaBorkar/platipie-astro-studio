import { Editor } from "@monaco-editor/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { ArrowLeftIcon, CopyIcon, HistoryIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { PageHeader, PageShell } from "#/components/gitbook/page";
import { LiveBadge } from "#/components/live-badge";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { useTheme } from "#/hooks/use-theme";
import { cmsKeys } from "./cms-keys";
import { FaithfulPreview } from "./edit/faithful-preview";
import { FrontmatterForm } from "./edit/frontmatter-form";
import type { Frontmatter, MediaItem } from "./edit/helpers";
import {
	deleteEntry,
	duplicateEntry,
	fetchEntryDiff,
	parseEntryRef,
	putEntry,
	renameEntry,
	slugStem,
} from "./edit/helpers";
import { JsonTableEditor } from "./edit/json-table-editor";
import type { JsonRow } from "./edit/json-table-editor";
import { SeoPane } from "./edit/seo-pane";
import type { SeoResponse } from "./edit/seo-pane";
import { formatMtimeTime } from "./format-mtime";
import { markdownToSafeHtml } from "./markdown";

export const Route = createFileRoute("/edit/$collection/$id")({
	component: UnifiedEditor,
	head: ({ params }) => ({ meta: [{ title: `${params.id} · platipie-astro-studio` }] }),
	validateSearch: (s: Record<string, unknown>) => ({
		path:
			typeof s.path === "string" ? s.path : Array.isArray(s.path) ? String(s.path[0] ?? "") : "",
	}),
});

interface Loaded {
	body: string;
	frontmatter: Frontmatter;
	hasFrontmatter: boolean;
	mtime: number;
	readOnly?: boolean;
	ref: { collection: string; path: string };
}

const WP_FIELDS = new Set([
	"author",
	"benefits",
	"canonicalUrl",
	"categories",
	"date",
	"description",
	"excerpt",
	"featuredImage",
	"filter_category",
	"hero_image",
	"hero_tag",
	"index",
	"keywords",
	"links",
	"metaDescription",
	"metaTitle",
	"modifiedDate",
	"nofollow",
	"noindex",
	"ogImage",
	"ogType",
	"publishDate",
	"schemaFields",
	"schemaType",
	"status",
	"tags",
	"timeline",
	"twitterCard",
	"year",
]);

function safeDecodeOnce(value: string): string {
	// TanStack already decodes search/params; decoding again corrupts literal
	// `%` and throws on malformed input. Only decode when a `%` escape is
	// present, and never throw.
	if (!value.includes("%")) return value;
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function useQueryPath(): string {
	const search = Route.useSearch() as { path?: unknown };
	const params = Route.useParams() as { collection: string; id: string | string[] };
	const rawPath =
		typeof search.path === "string"
			? search.path
			: Array.isArray(search.path)
				? String(search.path[0] ?? "")
				: "";
	// validateSearch is the primary selector; search.path arrives decoded, so
	// only strip a stray single encoding instead of blind-decoding.
	if (rawPath) return safeDecodeOnce(rawPath);
	const coll = params.collection;
	const rawId = Array.isArray(params.id) ? String(params.id[0] ?? "") : params.id;
	const id = safeDecodeOnce(rawId);
	// Backend path mapping duplicated here for instant (no-index-fetch)
	// resolution; mirrors the collections endpoint. Prefer an index lookup
	// once loaded, but keep this synchronous fallback for first paint.
	if (coll === "projects" || coll === "blog") return `cms/${coll}/${id}.md`;
	if (coll === "legal") return `src/pages/legal/${id}.mdx`;
	if (coll === "settings") return `cms/constants.ts`;
	return `cms/${coll}.json`;
}

function UnifiedEditor() {
	const filePath = useQueryPath();
	const navigate = Route.useNavigate();
	const { resolved } = useTheme();
	const [fm, setFm] = useState<Frontmatter>({});
	const [body, setBody] = useState("");
	const [mode, setMode] = useState<"markdown" | "visual">("markdown");
	const [mtime, setMtime] = useState(0);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [warnings, setWarnings] = useState<string[]>([]);
	const [diff, setDiff] = useState("");
	const [aiBusy, setAiBusy] = useState(false);
	const [aiDraft, setAiDraft] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const appliedRef = useRef<string | null>(null);

	const { fp, rowFrag } = parseEntryRef(filePath);
	const isJsonFile = fp.endsWith(".json");
	const [jsonRows, setJsonRows] = useState<JsonRow[]>([]);
	const [jsonRowId, setJsonRowId] = useState<string | null>(null);
	const [slugEdit, setSlugEdit] = useState("");

	const entryKey = cmsKeys.entry(fp);
	const fetchEntry = useCallback(() => fetchJson<Loaded>(cmsKeys.entry(fp)), [fp]);
	const entryQuery = useCachedFetch(entryKey, fetchEntry, {
		errorMessage: "Could not refresh entry",
	});
	const loaded = entryQuery.data;
	const entryLoading = loaded === null && entryQuery.isLoading;
	const entryRefreshing = loaded !== null && entryQuery.isRefreshing;

	const isMarkdown = fp.endsWith(".md") || fp.endsWith(".mdx");
	const seoKey = cmsKeys.seo(fp);
	const fetchSeo = useCallback(() => fetchJson<SeoResponse>(cmsKeys.seo(fp)), [fp]);
	const seoQuery = useCachedFetch(seoKey, fetchSeo, {
		enabled: isMarkdown,
		toastOnBackgroundError: false,
	});
	const seo = seoQuery.data;

	const fetchMedia = useCallback(() => fetchJson<{ media: MediaItem[] }>(cmsKeys.media), []);
	const mediaQuery = useCachedFetch(cmsKeys.media, fetchMedia, {
		toastOnBackgroundError: false,
	});
	const media = mediaQuery.data?.media ?? [];

	useEffect(() => {
		if (entryQuery.error && loaded === null) {
			setErr(entryQuery.error);
		} else if (loaded !== null) {
			setErr(null);
		}
	}, [entryQuery.error, loaded]);

	useEffect(() => {
		if (!loaded) return;
		if (appliedRef.current === loaded.ref.path) return;
		appliedRef.current = loaded.ref.path;
		setErr(null);
		setMsg(null);
		setFm(loaded.frontmatter ?? {});
		setBody(loaded.body ?? "");
		setMtime(loaded.mtime);
		setSlugEdit(slugStem(fp));
		if (fp.endsWith(".json")) {
			try {
				const arr: unknown = JSON.parse(loaded.body ?? "[]");
				setJsonRows(Array.isArray(arr) ? (arr as JsonRow[]) : []);
				setJsonRowId(rowFrag);
			} catch {
				setJsonRows([]);
			}
		}
	}, [fp, loaded, rowFrag]);

	const unknownKeys = useMemo(() => Object.keys(fm).filter((k) => !WP_FIELDS.has(k)), [fm]);
	const previewHtml = useMemo(() => markdownToSafeHtml(body), [body]);

	// Visual mode is a read-only preview: TipTap never writes back into the
	// canonical Markdown body, so MDX/JSX round-trips stay lossless.
	const tiptap = useEditor(
		{
			content: "",
			editable: false,
			extensions: [StarterKit],
		},
		[loaded?.ref.path],
	);

	useEffect(() => {
		if (mode === "visual" && tiptap && !tiptap.isDestroyed) {
			tiptap.commands.setContent(markdownToSafeHtml(body));
		}
	}, [body, mode, tiptap]);

	async function save(force = false) {
		setErr(null);
		setMsg(null);
		setFieldErrors({});
		try {
			const text = isJsonFile ? `${JSON.stringify(jsonRows, null, 2)}\n` : body;
			const j = await putEntry({
				body: text,
				collection: loaded?.ref.collection,
				force,
				fp,
				frontmatter: isJsonFile ? {} : fm,
				mtime,
			});
			setMtime(j.mtime);
			setDiff(j.diff ?? "");
			setWarnings(j.warnings ?? []);
			setMsg(isJsonFile ? `Saved ${j.path}` : `Saved ${j.path} · modifiedDate touched`);
			toast.success(`Saved ${j.path}`);
			entryQuery.refresh();
			if (!isJsonFile) seoQuery.refresh();
		} catch (e: unknown) {
			const code = (e as { code?: unknown }).code;
			const fields = (e as { fields?: Record<string, string> }).fields;
			const diffText = (e as { diff?: string }).diff;
			if (code === "CONFLICT") {
				setErr(
					isJsonFile
						? `Conflict: ${e instanceof Error ? e.message : String(e)}`
						: `Conflict (409): ${e instanceof Error ? e.message : String(e)}. Review diff, then retry with Force.`,
				);
				setDiff(diffText ?? "");
				return;
			}
			if (fields) setFieldErrors(fields);
			const message = e instanceof Error ? e.message : String(e);
			setErr(message);
			toast.error(message);
		}
	}

	if (!loaded) {
		if (err) {
			return (
				<PageShell>
					<Hint title="Failed to load entry" variant="danger">
						{err}
					</Hint>
				</PageShell>
			);
		}
		if (!entryLoading) {
			return (
				<PageShell>
					<Hint title="Failed to load entry" variant="danger">
						{entryQuery.error ?? "Entry not found"}
					</Hint>
				</PageShell>
			);
		}
		return (
			<PageShell>
				<div className="grid gap-3">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-96 w-full" />
				</div>
			</PageShell>
		);
	}

	if (loaded.readOnly) {
		return (
			<PageShell>
				<Hint title="Read-only" variant="warning">
					{loaded.ref.path} ({(loaded.body ?? "").length} bytes &gt; 1 MB guard)
				</Hint>
			</PageShell>
		);
	}

	const collection = loaded.ref.collection;

	return (
		<PageShell>
			<PageHeader
				actions={
					<Button
						nativeButton={false}
						render={<Link search={{ collection: undefined, entry: undefined }} to="/content" />}
						size="sm"
						variant="outline"
					>
						<ArrowLeftIcon className="size-3.5" />
						Back to content
					</Button>
				}
				description={
					<>
						Editing <code>{loaded.ref.path}</code>. Files stay the source of truth; save writes
						straight to the checkout.
					</>
				}
				eyebrow="Editor"
				meta={
					<>
						<Badge variant="secondary">{collection}</Badge>
						<Badge variant={fm.status === "published" ? "success" : "outline"}>
							{String(fm.status ?? "draft")}
						</Badge>
						<Badge className="font-mono" variant="outline">
							updated {formatMtimeTime(mtime)}
						</Badge>
						<LiveBadge refreshing={entryRefreshing} />
					</>
				}
				title={loaded.ref.path.split("/").pop()}
			/>

			<div className="mt-6 grid gap-4">
				<Card>
					<CardContent className="flex flex-wrap items-center gap-2">
						<Button onClick={() => void save(false)} size="sm">
							<SaveIcon />
							Save
						</Button>
						<Button onClick={() => void save(true)} size="sm" variant="outline">
							Force save
						</Button>
						<Button
							onClick={() => {
								void fetchEntryDiff(fp)
									.then((text) => setDiff(text))
									.catch((e: unknown) => toast.error(String(e)));
							}}
							size="sm"
							variant="ghost"
						>
							<HistoryIcon />
							Diff vs .bak
						</Button>
						<Button
							onClick={() => {
								void duplicateEntry(fp)
									.then((path) => {
										setMsg(`Duplicated → ${path}`);
										toast.success(`Duplicated → ${path}`);
									})
									.catch((e: unknown) => {
										const message = e instanceof Error ? e.message : String(e);
										setMsg(message);
										toast.error(message);
									});
							}}
							size="sm"
							variant="outline"
						>
							<CopyIcon />
							Duplicate
						</Button>
						<Button
							className="sm:ml-auto"
							onClick={() => setDeleteOpen(true)}
							size="sm"
							variant="destructive"
						>
							<Trash2Icon />
							Delete
						</Button>
					</CardContent>
				</Card>

				{err ? (
					<Hint title="Error" variant="danger">
						{err}
					</Hint>
				) : null}
				{msg ? (
					<Hint title="Saved" variant="success">
						{msg}
					</Hint>
				) : null}
				{Object.keys(fieldErrors).length > 0 ? (
					<Hint title="Validation failed" variant="danger">
						{Object.entries(fieldErrors)
							.map(([k, v]) => `${k}: ${v}`)
							.join("; ")}
					</Hint>
				) : null}
				{warnings.length > 0 ? (
					<Hint title="Warnings" variant="warning">
						{warnings.join(" · ")}
					</Hint>
				) : null}
				{unknownKeys.length > 0 ? (
					<Hint title="Drift" variant="warning">
						Unknown keys round-trip untouched: {unknownKeys.join(", ")}
					</Hint>
				) : null}

				{(collection === "projects" || collection === "blog") && (
					<Card>
						<CardContent className="flex flex-wrap items-end gap-2">
							<Field className="min-w-52 flex-1">
								<FieldLabel htmlFor="slug-edit">Slug (filename)</FieldLabel>
								<Input
									id="slug-edit"
									onChange={(e) => setSlugEdit(e.target.value)}
									value={slugEdit}
								/>
							</Field>
							<Button
								onClick={() => {
									void renameEntry(fp, slugEdit)
										.then((path) => {
											setMsg(`Renamed → ${path}`);
											toast.success(`Renamed → ${path}`);
											void navigate({
												params: { collection, id: slugEdit },
												search: { path },
											});
										})
										.catch((e: unknown) => {
											const message = e instanceof Error ? e.message : String(e);
											setErr(message);
											toast.error(message);
										});
								}}
								size="sm"
								variant="outline"
							>
								Rename via slug
							</Button>
						</CardContent>
					</Card>
				)}

				{isJsonFile ? (
					<JsonTableEditor
						media={media}
						rowId={jsonRowId}
						rows={jsonRows}
						setRowId={setJsonRowId}
						setRows={setJsonRows}
					/>
				) : fp.endsWith(".ts") ? (
					<Card>
						<CardHeader>
							<CardTitle>Settings file</CardTitle>
							<CardDescription>
								Settings file — use <a href="/settings">/settings</a> typed form + raw fallback.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Editor
								height="400px"
								language="typescript"
								onChange={(v) => setBody(v ?? "")}
								options={{ minimap: { enabled: false } }}
								theme={resolved === "dark" ? "vs-dark" : "vs"}
								value={body}
							/>
						</CardContent>
					</Card>
				) : (
					<div className="grid-cols-editor grid items-start gap-4">
						<Card>
							<CardHeader>
								<CardTitle>Frontmatter</CardTitle>
								{aiDraft && <CardDescription>AI-drafted until edited: {aiDraft}</CardDescription>}
							</CardHeader>
							<CardContent>
								<FrontmatterForm
									aiDraft={aiDraft}
									fieldErrors={fieldErrors}
									fm={fm}
									media={media}
									setFm={setFm}
								/>
							</CardContent>
						</Card>
						<div className="grid min-w-0 gap-4">
							<Tabs onValueChange={(v) => setMode(v as "markdown" | "visual")} value={mode}>
								<Card>
									<CardHeader className="flex-row items-center justify-between gap-2">
										<CardTitle>Source</CardTitle>
										<TabsList>
											<TabsTrigger value="markdown">Markdown</TabsTrigger>
											<TabsTrigger value="visual">Visual</TabsTrigger>
										</TabsList>
									</CardHeader>
									<CardContent>
										<TabsContent value="markdown">
											<Editor
												height="420px"
												language="markdown"
												onChange={(v) => setBody(v ?? "")}
												options={{ minimap: { enabled: false }, wordWrap: "on" }}
												theme={resolved === "dark" ? "vs-dark" : "vs"}
												value={body}
											/>
											{(body.includes("import ") || /\{[A-Z_]+\./u.test(body)) && (
												<Hint className="mt-3" title="MDX constructs detected" variant="warning">
													Visual mode shows opaque placeholders; Markdown preserves byte-for-byte.
												</Hint>
											)}
										</TabsContent>
										<TabsContent value="visual">
											{tiptap && <EditorContent editor={tiptap} />}
											<p className="mt-2 text-xs text-muted-foreground">
												Visual is a read-only preview — edit in Markdown so MDX and JSX round-trip
												byte-for-byte.
											</p>
										</TabsContent>
									</CardContent>
								</Card>
							</Tabs>
							<Card>
								<CardHeader>
									<CardTitle>Local preview</CardTitle>
								</CardHeader>
								<CardContent>
									<div
										className="prose-preview"
										dangerouslySetInnerHTML={{ __html: previewHtml }}
									/>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>Faithful preview (read-only iframe)</CardTitle>
								</CardHeader>
								<CardContent>
									<FaithfulPreview collection={collection} slug={slugEdit} />
								</CardContent>
							</Card>
							{diff && (
								<Card>
									<CardHeader>
										<CardTitle>Diff</CardTitle>
									</CardHeader>
									<CardContent>
										<ScrollArea className="max-h-58vh">
											<pre className="code-surface p-3 font-mono text-xs whitespace-pre-wrap">
												{diff.slice(0, 8000)}
											</pre>
										</ScrollArea>
									</CardContent>
								</Card>
							)}
						</div>
						<Card>
							<CardHeader>
								<CardTitle>SEO assistant</CardTitle>
							</CardHeader>
							<CardContent>
								<SeoPane
									aiBusy={aiBusy}
									body={body}
									fm={fm}
									seo={seo}
									setAiBusy={setAiBusy}
									setAiDraft={setAiDraft}
									setFm={setFm}
								/>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Schema markup</CardTitle>
								<CardDescription>
									{String(fm.schemaType ?? "No schemaType selected")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<pre className="code-surface p-3 font-mono text-10 whitespace-pre-wrap">
									{JSON.stringify(
										{
											"@context": "https://schema.org",
											"@type": String(fm.schemaType ?? "WebPage"),
											...(typeof fm.schemaFields === "object" &&
											fm.schemaFields !== null &&
											!Array.isArray(fm.schemaFields)
												? (fm.schemaFields as Record<string, unknown>)
												: {}),
										},
										null,
										2,
									)}
								</pre>
							</CardContent>
						</Card>
					</div>
				)}

				<AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this entry?</AlertDialogTitle>
							<AlertDialogDescription>
								The entry is soft-deleted to trash and can be restored from Settings.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<Button
								onClick={() => {
									setDeleteOpen(false);
									void deleteEntry(fp, jsonRowId ?? undefined)
										.then((trashPath) => {
											const message = `Trashed → ${trashPath}`;
											setMsg(message);
											toast.success(message);
										})
										.catch((e: unknown) => {
											const message = e instanceof Error ? e.message : String(e);
											setMsg(`Delete failed: ${message}`);
											toast.error(message);
										});
								}}
								variant="destructive"
							>
								Delete
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</PageShell>
	);
}
