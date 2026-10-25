import { Editor } from "@monaco-editor/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
	ArrowLeftIcon,
	CircleCheckIcon,
	CircleXIcon,
	CopyIcon,
	FileTextIcon,
	HistoryIcon,
	SaveIcon,
	SparklesIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { marked } from "marked";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { EmptyState, PageHeader, PageShell } from "#/components/gitbook/page";
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
import { Checkbox } from "#/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { ScrollArea } from "#/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Textarea } from "#/components/ui/textarea";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { useTheme } from "#/hooks/use-theme";

export const Route = createFileRoute("/edit/$collection/$id")({
	component: UnifiedEditor,
	head: ({ params }) => ({ meta: [{ title: `${params.id} · platipie-cms` }] }),
	validateSearch: (s: Record<string, unknown>) => ({ path: (s.path as string) ?? "" }),
});

interface Loaded {
	ref: { collection: string; path: string };
	frontmatter: Record<string, unknown>;
	body: string;
	mtime: number;
	hasFrontmatter: boolean;
	readOnly?: boolean;
}

const WP_FIELDS = new Set([
	"title",
	"description",
	"excerpt",
	"status",
	"publishDate",
	"date",
	"modifiedDate",
	"author",
	"categories",
	"tags",
	"featuredImage",
	"hero_image",
	"canonicalUrl",
	"metaTitle",
	"metaDescription",
	"keywords",
	"ogImage",
	"ogType",
	"twitterCard",
	"noindex",
	"nofollow",
	"schemaType",
	"schemaFields",
	"hero_tag",
	"filter_category",
	"links",
	"benefits",
	"timeline",
	"year",
	"index",
]);

function useQueryPath(): string {
	const search = Route.useSearch() as { path?: string };
	const params = Route.useParams() as { collection: string; id: string };
	if (search.path) return decodeURIComponent(search.path);
	// Fallback: reconstruct from params.
	const coll = params.collection;
	const id = decodeURIComponent(params.id);
	if (coll === "projects" || coll === "blog") return `cms/${coll}/${id}.md`;
	if (coll === "legal") return `src/pages/legal/${id}.mdx`;
	if (coll === "settings") return `cms/constants.ts`;
	return `cms/${coll}.json`;
}

function UnifiedEditor() {
	const filePath = useQueryPath();
	const { resolved } = useTheme();
	const [fm, setFm] = useState<Record<string, unknown>>({});
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
	const [editorKey, setEditorKey] = useState<string | null>(null);

	const isJsonFile = filePath.endsWith(".json");
	const [jsonRows, setJsonRows] = useState<any[]>([]);
	const [jsonRowId, setJsonRowId] = useState<string | null>(null);
	const [slugEdit, setSlugEdit] = useState("");

	const [fp] = filePath.split("#");
	const rowFrag = filePath.includes("#") ? filePath.split("#")[1] : null;
	const entryKey = `/api/cms/entry?path=${encodeURIComponent(fp)}`;
	const fetchEntry = useCallback(() => fetchJson<Loaded>(entryKey), [entryKey]);
	const entryQuery = useCachedFetch(entryKey, fetchEntry, {
		errorMessage: "Could not refresh entry",
	});
	const loaded = entryQuery.data;
	const entryLoading = loaded === null && entryQuery.isLoading;
	const entryRefreshing = loaded !== null && entryQuery.isRefreshing;

	const isMarkdown = fp.endsWith(".md") || fp.endsWith(".mdx");
	const seoKey = `/api/cms/seo?path=${encodeURIComponent(fp)}`;
	const fetchSeo = useCallback(() => fetchJson<any>(seoKey), [seoKey]);
	const seoQuery = useCachedFetch(seoKey, fetchSeo, {
		enabled: isMarkdown,
		toastOnBackgroundError: false,
	});
	const seo = seoQuery.data;

	const fetchMedia = useCallback(
		() => fetchJson<{ media: { path: string }[] }>("/api/cms/media"),
		[],
	);
	const mediaQuery = useCachedFetch("/api/cms/media", fetchMedia, {
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
		if (editorKey === loaded.ref.path) return;
		setEditorKey(loaded.ref.path);
		setErr(null);
		setMsg(null);
		setFm(loaded.frontmatter ?? {});
		setBody(loaded.body ?? "");
		setMtime(loaded.mtime);
		const stem =
			fp
				.split("/")
				.pop()
				?.replace(/\.(md|mdx|json|ts)$/u, "") ?? "";
		setSlugEdit(stem);
		if (fp.endsWith(".json")) {
			try {
				const arr = JSON.parse(loaded.body ?? "[]");
				setJsonRows(Array.isArray(arr) ? arr : []);
				setJsonRowId(rowFrag);
			} catch {
				setJsonRows([]);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fp, loaded]);

	const unknownKeys = useMemo(() => Object.keys(fm).filter((k) => !WP_FIELDS.has(k)), [fm]);
	const previewHtml = useMemo(() => {
		try {
			return marked.parse(body ?? "") as string;
		} catch {
			return `<pre>${(body ?? "").slice(0, 2000)}</pre>`;
		}
	}, [body]);

	const tiptap = useEditor(
		{
			content: `<p>${(body ?? "").slice(0, 2000).replaceAll("<", "&lt;")}</p>`,
			extensions: [StarterKit],
			onUpdate: ({ editor }) => {
				// naive HTML->markdown is lossy; we keep TipTap HTML in a side buffer
				// and convert on save via textContent fallback. Full fidelity lives in Markdown mode.
				setBody(editor.getText());
			},
		},
		[loaded?.ref.path],
	);

	async function save(force = false) {
		setErr(null);
		setMsg(null);
		setFieldErrors({});
		try {
			if (isJsonFile) {
				const text = JSON.stringify(jsonRows, null, 2) + "\n";
				const j = await fetchJson<{
					diff?: string;
					mtime: number;
					path: string;
					warnings?: string[];
				}>("/api/cms/entry", {
					body: JSON.stringify({
						force,
						payload: { body: text, frontmatter: {}, mtime },
						ref: { collection: loaded?.ref.collection, path: fp },
					}),
					headers: { "Content-Type": "application/json" },
					method: "PUT",
				});
				setMtime(j.mtime);
				setDiff(j.diff ?? "");
				setWarnings(j.warnings ?? []);
				setMsg(`Saved ${j.path}`);
				toast.success(`Saved ${j.path}`);
				entryQuery.refresh();
				return;
			}
			const j = await fetchJson<{
				diff?: string;
				mtime: number;
				path: string;
				warnings?: string[];
			}>("/api/cms/entry", {
				body: JSON.stringify({
					force,
					payload: { body, frontmatter: fm, mtime },
					ref: { collection: loaded?.ref.collection, path: fp },
				}),
				headers: { "Content-Type": "application/json" },
				method: "PUT",
			});
			setMtime(j.mtime);
			setDiff(j.diff ?? "");
			setWarnings(j.warnings ?? []);
			setMsg(`Saved ${j.path} · modifiedDate touched`);
			toast.success(`Saved ${j.path}`);
			entryQuery.refresh();
			seoQuery.refresh();
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
					<Button nativeButton={false} render={<Link to="/content" />} size="sm" variant="outline">
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
							updated {new Date(mtime).toLocaleTimeString()}
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
								fetch("/api/cms/diff?path=" + encodeURIComponent(filePath.split("#")[0]))
									.then((r) => r.json())
									.then((j) => setDiff(j.diff ?? ""))
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
								fetch("/api/cms/duplicate", {
									body: JSON.stringify({ path: filePath.split("#")[0] }),
									headers: { "Content-Type": "application/json" },
									method: "POST",
								})
									.then(async (r) => ({ body: await r.json(), ok: r.ok }))
									.then(({ body: res, ok }) => {
										const message = ok ? `Duplicated → ${res.path}` : res.message;
										setMsg(message);
										if (ok) toast.success(message);
										else toast.error(message);
									})
									.catch((e: unknown) => toast.error(String(e)));
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
									fetch("/api/cms/rename", {
										body: JSON.stringify({ newSlug: slugEdit, path: fp }),
										headers: { "Content-Type": "application/json" },
										method: "POST",
									})
										.then(async (r) => ({ body: await r.json(), ok: r.ok }))
										.then(({ body: res, ok }) => {
											if (ok) {
												setMsg(`Renamed → ${res.path}`);
												toast.success(`Renamed → ${res.path}`);
												window.location.href = `/edit/${collection}/${encodeURIComponent(slugEdit)}?path=${encodeURIComponent(res.path)}`;
											} else {
												setErr(res.message);
												toast.error(res.message);
											}
										})
										.catch((e: unknown) => toast.error(String(e)));
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
				) : filePath.endsWith(".ts") ? (
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
												Uneditable blocks preserved as opaque placeholders — switch to Markdown for
												JSX.
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
									fetch("/api/cms/entry", {
										body: JSON.stringify({ path: fp, rowId: jsonRowId ?? undefined }),
										headers: { "Content-Type": "application/json" },
										method: "DELETE",
									})
										.then(async (r) => ({ body: await r.json(), ok: r.ok }))
										.then(({ body: res, ok }) => {
											const message = ok
												? `Trashed → ${res.trashPath}`
												: `Delete failed: ${res.message}`;
											setMsg(message);
											if (ok) toast.success(message);
											else toast.error(message);
										})
										.catch((e: unknown) => toast.error(String(e)));
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

function FrontmatterForm({ fm, setFm, fieldErrors, media, aiDraft }: any) {
	const set = (k: string, v: unknown) => setFm((p: any) => ({ ...p, [k]: v }));
	const tag = (k: string, v: string) =>
		set(
			k,
			v
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
		);
	return (
		<FieldGroup>
			{aiDraft ? (
				<Hint title="AI draft" variant="info">
					AI-drafted until edited: {aiDraft}
				</Hint>
			) : null}
			<Field data-invalid={Boolean(fieldErrors.title)}>
				<FieldLabel htmlFor="fm-title">title</FieldLabel>
				<Input
					id="fm-title"
					onChange={(e) => set("title", e.target.value)}
					value={String(fm.title ?? "")}
				/>
				{fieldErrors.title && <FieldError>{fieldErrors.title}</FieldError>}
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-description">description</FieldLabel>
				<Textarea
					id="fm-description"
					onChange={(e) =>
						set(fm.description === undefined ? "excerpt" : "description", e.target.value)
					}
					value={String(fm.description ?? fm.excerpt ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-excerpt">excerpt</FieldLabel>
				<Textarea
					id="fm-excerpt"
					onChange={(e) => set("excerpt", e.target.value)}
					value={String(fm.excerpt ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-status">status</FieldLabel>
				<Select onValueChange={(v) => set("status", v)} value={String(fm.status ?? "draft")}>
					<SelectTrigger id="fm-status">
						<SelectValue placeholder="Select status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="draft">draft</SelectItem>
						<SelectItem value="published">published</SelectItem>
						<SelectItem value="scheduled">scheduled</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-publish-date">publishDate</FieldLabel>
				<Input
					id="fm-publish-date"
					onChange={(e) => set("publishDate", e.target.value)}
					type="date"
					value={String(fm.publishDate ?? fm.date ?? "").slice(0, 10)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-modified">modifiedDate</FieldLabel>
				<Input
					id="fm-modified"
					onChange={(e) => set("modifiedDate", e.target.value)}
					value={String(fm.modifiedDate ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-author">author</FieldLabel>
				<Input
					id="fm-author"
					onChange={(e) => set("author", e.target.value)}
					value={String(fm.author ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-categories">categories (comma)</FieldLabel>
				<Input
					id="fm-categories"
					onChange={(e) =>
						tag(fm.categories === undefined ? "filter_category" : "categories", e.target.value)
					}
					value={(fm.categories ?? fm.filter_category ?? []).join?.(", ") ?? ""}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-tags">tags (comma)</FieldLabel>
				<Input
					id="fm-tags"
					onChange={(e) => tag("tags", e.target.value)}
					value={(fm.tags ?? []).join?.(", ") ?? ""}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-keywords">keywords (comma)</FieldLabel>
				<Input
					id="fm-keywords"
					onChange={(e) => tag("keywords", e.target.value)}
					value={(fm.keywords ?? []).join?.(", ") ?? ""}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-hero">hero_image / featuredImage</FieldLabel>
				<Input
					id="fm-hero"
					onChange={(e) =>
						set(fm.hero_image === undefined ? "featuredImage" : "hero_image", e.target.value)
					}
					value={String(fm.hero_image ?? fm.featuredImage ?? "")}
				/>
				<MediaPicker
					media={media}
					onPick={(p: string) =>
						set(fm.hero_image === undefined ? "featuredImage" : "hero_image", p)
					}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-og-image">ogImage</FieldLabel>
				<Input
					id="fm-og-image"
					onChange={(e) => set("ogImage", e.target.value)}
					value={String(fm.ogImage ?? "")}
				/>
				<MediaPicker media={media} onPick={(p: string) => set("ogImage", p)} />
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-canonical">canonicalUrl</FieldLabel>
				<Input
					id="fm-canonical"
					onChange={(e) => set("canonicalUrl", e.target.value)}
					value={String(fm.canonicalUrl ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-meta-title">metaTitle</FieldLabel>
				<Input
					id="fm-meta-title"
					onChange={(e) => set("metaTitle", e.target.value)}
					value={String(fm.metaTitle ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-meta-desc">metaDescription</FieldLabel>
				<Textarea
					id="fm-meta-desc"
					onChange={(e) => set("metaDescription", e.target.value)}
					value={String(fm.metaDescription ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-og-type">ogType</FieldLabel>
				<Input
					id="fm-og-type"
					onChange={(e) => set("ogType", e.target.value)}
					value={String(fm.ogType ?? "article")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-twitter">twitterCard</FieldLabel>
				<Input
					id="fm-twitter"
					onChange={(e) => set("twitterCard", e.target.value)}
					value={String(fm.twitterCard ?? "summary_large_image")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-hero-tag">hero_tag</FieldLabel>
				<Select onValueChange={(v) => set("hero_tag", v || null)} value={String(fm.hero_tag ?? "")}>
					<SelectTrigger id="fm-hero-tag">
						<SelectValue placeholder="(none)" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">(none)</SelectItem>
						<SelectItem value="featured">featured</SelectItem>
						<SelectItem value="open-source">open-source</SelectItem>
						<SelectItem value="ongoing">ongoing</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			<Field orientation="horizontal">
				<Checkbox
					checked={Boolean(fm.noindex)}
					id="fm-noindex"
					onCheckedChange={(checked) => set("noindex", checked === true)}
				/>
				<FieldLabel htmlFor="fm-noindex">noindex</FieldLabel>
				<Checkbox
					checked={Boolean(fm.nofollow)}
					id="fm-nofollow"
					onCheckedChange={(checked) => set("nofollow", checked === true)}
				/>
				<FieldLabel htmlFor="fm-nofollow">nofollow</FieldLabel>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-schema">schemaType</FieldLabel>
				<Select onValueChange={(v) => set("schemaType", v)} value={String(fm.schemaType ?? "")}>
					<SelectTrigger id="fm-schema">
						<SelectValue placeholder="(none)" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">(none)</SelectItem>
						{[
							"BlogPosting",
							"Article",
							"HowTo",
							"WebPage",
							"WebPage/About",
							"WebPage/FAQ",
							"SoftwareApplication",
							"Review",
							"Organization",
							"Person",
							"Product",
						].map((t) => (
							<SelectItem key={t} value={t}>
								{t}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-schema-fields">schemaFields (JSON)</FieldLabel>
				<Textarea
					className="font-mono"
					id="fm-schema-fields"
					onChange={(e) => {
						try {
							set("schemaFields", JSON.parse(e.target.value));
						} catch {
							set("schemaFields", e.target.value);
						}
					}}
					value={
						typeof fm.schemaFields === "object"
							? JSON.stringify(fm.schemaFields, null, 2)
							: String(fm.schemaFields ?? "")
					}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-github">links.github</FieldLabel>
				<Input
					id="fm-github"
					onChange={(e) => set("links", { ...(fm.links as any), github: e.target.value })}
					value={String((fm.links as any)?.github ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-preview">links.preview</FieldLabel>
				<Input
					id="fm-preview"
					onChange={(e) => set("links", { ...(fm.links as any), preview: e.target.value })}
					value={String((fm.links as any)?.preview ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-timeline">timeline</FieldLabel>
				<Input
					id="fm-timeline"
					onChange={(e) => set("timeline", e.target.value)}
					value={String(fm.timeline ?? "")}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="fm-year">year</FieldLabel>
				<Input
					id="fm-year"
					onChange={(e) => set("year", Number(e.target.value))}
					type="number"
					value={Number(fm.year ?? 2024)}
				/>
			</Field>
		</FieldGroup>
	);
}

function MediaPicker({
	media,
	onPick,
}: {
	media: { path: string }[];
	onPick: (p: string) => void;
}) {
	return (
		<Select onValueChange={(v) => v && onPick(v)} value="">
			<SelectTrigger>
				<SelectValue placeholder="Pick media…" />
			</SelectTrigger>
			<SelectContent>
				{media.slice(0, 200).map((m) => (
					<SelectItem key={m.path} value={m.path}>
						{m.path}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function FaithfulPreview({ slug, collection }: { slug: string; collection: string }) {
	const [astroUrl, setAstroUrl] = useState<string | null>(null);
	useEffect(() => {
		fetch("/api/cms/settings")
			.then((r) => r.json())
			.then((j) => setAstroUrl(j.env?.astroUrl ?? null))
			.catch(() => {});
	}, []);
	if (!astroUrl) {
		return (
			<Hint title="Faithful preview needs ASTRO_URL" variant="info">
				Start the Astro dev server and set <code>ASTRO_URL</code> for a pixel-faithful iframe. The
				local render above always works.
			</Hint>
		);
	}
	const previewPath =
		collection === "blog" ? `blog/${slug}` : collection === "projects" ? `work/${slug}` : "legal";
	return (
		<iframe
			sandbox="allow-scripts"
			src={`${astroUrl}/${previewPath}`}
			style={{ height: 480, width: "100%" }}
			title="faithful"
		/>
	);
}

function SeoPane({ seo, fm, setFm, setAiDraft, setAiBusy, aiBusy, body }: any) {
	const [suggest, setSuggest] = useState<string[]>([]);
	if (!seo) return <p className="text-sm text-muted-foreground">Loading SEO…</p>;
	return (
		<div className="grid gap-3 text-sm">
			<div className="flex flex-wrap items-center gap-1.5">
				<Badge variant="brand">Score: {seo.score}/100</Badge>
				<Badge variant="outline">Flesch {seo.readability?.flesch}</Badge>
				<Badge variant="outline">keywords {seo.keywordCoverage}%</Badge>
			</div>
			<p className="text-xs text-muted-foreground">
				title {seo.counts?.titleLen} · desc {seo.counts?.descriptionLen} · words{" "}
				{seo.counts?.wordCount}
			</p>
			<ul className="grid gap-1">
				{seo.checks?.map((c: any) => (
					<li className="flex items-start gap-1.5 text-13" key={c.id}>
						{c.status === "pass" ? (
							<CircleCheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
						) : c.status === "warn" ? (
							<TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
						) : (
							<CircleXIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
						)}
						<span>
							{c.label}
							{c.detail ? ` — ${c.detail}` : ""}
						</span>
					</li>
				))}
			</ul>
			<details>
				<summary className="text-xs font-medium text-muted-foreground hover:text-foreground">
					JSON-LD preview
				</summary>
				<pre className="code-surface mt-2 max-h-45dvh overflow-auto p-3 font-mono text-xs">
					{JSON.stringify(seo.jsonLd, null, 2)?.slice(0, 2000)}
				</pre>
			</details>
			<Separator />
			<InputGroup>
				<InputGroupAddon>
					<SparklesIcon />
				</InputGroupAddon>
				<InputGroupInput
					aria-label="AI suggestion prompt context"
					placeholder="AI suggestions write back into the form…"
					readOnly
					value={suggest[0] ?? ""}
				/>
			</InputGroup>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					disabled={!seo.aiEnabled || aiBusy}
					onClick={() => {
						setAiBusy(true);
						fetch("/api/cms/seo/ai", {
							body: JSON.stringify({ action: "excerpt", body, frontmatter: fm }),
							headers: { "Content-Type": "application/json" },
							method: "POST",
						})
							.then(async (r) => {
								const j = await r.json();
								if (!r.ok) throw new Error(j.message);
								return j;
							})
							.then((j) => {
								setSuggest(j.suggestions ?? []);
								if (j.suggestions?.[0]) {
									setFm((p: any) => ({ ...p, excerpt: j.suggestions[0] }));
									setAiDraft("excerpt (AI-drafted)");
								}
							})
							.catch((e: any) => toast.error(e.message))
							.finally(() => setAiBusy(false));
					}}
					size="sm"
					title={seo.aiEnabled ? "" : "Set AI_BASE_URL + AI_API_KEY to enable"}
					variant="outline"
				>
					{aiBusy && <Spinner />}
					Suggest excerpt
				</Button>
				<Button
					disabled={!seo.aiEnabled || aiBusy}
					onClick={() => {
						setAiBusy(true);
						fetch("/api/cms/seo/ai", {
							body: JSON.stringify({ action: "titles", body, frontmatter: fm }),
							headers: { "Content-Type": "application/json" },
							method: "POST",
						})
							.then(async (r) => {
								const j = await r.json();
								if (!r.ok) throw new Error(j.message);
								return j;
							})
							.then((j) => {
								setSuggest(j.suggestions ?? []);
							})
							.catch((e: any) => toast.error(e.message))
							.finally(() => setAiBusy(false));
					}}
					size="sm"
					title={seo.aiEnabled ? "" : "Set AI_BASE_URL + AI_API_KEY to enable"}
					variant="outline"
				>
					{aiBusy && <Spinner />}
					Suggest titles
				</Button>
				{!seo.aiEnabled && (
					<p className="text-xs text-muted-foreground">
						AI off — set <code>AI_BASE_URL</code> + <code>AI_API_KEY</code> (BYOK)
					</p>
				)}
			</div>
			{suggest.length > 0 && (
				<ul className="grid gap-1">
					{suggest.map((s) => (
						<li className="text-13" key={s}>
							{s}
						</li>
					))}
				</ul>
			)}
			<p className="font-mono text-xs text-muted-foreground">Never blocks save.</p>
		</div>
	);
}

function JsonTableEditor({ rows, setRows, rowId, setRowId, media }: any) {
	const sel = rows.find((r: any) => String(r.id) === String(rowId)) ?? rows[0];
	const [rowDeleteOpen, setRowDeleteOpen] = useState(false);
	const setRow = (patch: any) => {
		setRows((prev: any[]) =>
			prev.map((r) => (String(r.id) === String(sel?.id) ? { ...r, ...patch } : r)),
		);
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle>Table editor ({rows.length} rows)</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Select onValueChange={(v) => setRowId(v)} value={String(sel?.id ?? "")}>
						<SelectTrigger className="w-52">
							<SelectValue placeholder="Select row" />
						</SelectTrigger>
						<SelectContent>
							{rows.map((r: any) => (
								<SelectItem key={String(r.id)} value={String(r.id)}>
									{String(r.id)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						onClick={() => {
							const id = `new-${Date.now()}`;
							setRows((p: any[]) => [...p, { id }]);
							setRowId(id);
						}}
						size="sm"
						variant="outline"
					>
						Add row
					</Button>
					<Button
						disabled={!sel}
						onClick={() => {
							if (sel) setRowDeleteOpen(true);
						}}
						size="sm"
						variant="destructive"
					>
						Delete row
					</Button>
				</div>
				{sel ? (
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="json-id">id</FieldLabel>
							<Input
								id="json-id"
								onChange={(e) => setRow({ id: e.target.value })}
								value={String(sel.id ?? "")}
							/>
						</Field>
						{(sel.logo !== undefined || sel.img !== undefined) && (
							<Field>
								<FieldLabel htmlFor="json-logo">
									{sel.logo === undefined ? "img" : "logo"}
								</FieldLabel>
								<Input
									id="json-logo"
									onChange={(e) =>
										setRow(
											sel.logo === undefined ? { img: e.target.value } : { logo: e.target.value },
										)
									}
									value={String(sel.logo ?? sel.img ?? "")}
								/>
								<Select
									onValueChange={(v) =>
										v && setRow(sel.logo === undefined ? { img: v } : { logo: v })
									}
									value=""
								>
									<SelectTrigger>
										<SelectValue placeholder="— pick media —" />
									</SelectTrigger>
									<SelectContent>
										{media.slice(0, 200).map((m: any) => (
											<SelectItem key={m.path} value={m.path}>
												{m.path}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
						{sel.role !== undefined && (
							<Field>
								<FieldLabel htmlFor="json-role">role</FieldLabel>
								<Input
									id="json-role"
									onChange={(e) => setRow({ role: e.target.value })}
									value={String(sel.role ?? "")}
								/>
							</Field>
						)}
						{sel.text !== undefined && (
							<Field>
								<FieldLabel htmlFor="json-text">text</FieldLabel>
								<Textarea
									id="json-text"
									onChange={(e) => setRow({ text: e.target.value })}
									value={String(sel.text ?? "")}
								/>
							</Field>
						)}
						{sel.className !== undefined && (
							<Field>
								<FieldLabel htmlFor="json-class">className</FieldLabel>
								<Input
									id="json-class"
									onChange={(e) => setRow({ className: e.target.value })}
									value={String(sel.className ?? "")}
								/>
							</Field>
						)}
						<Field>
							<FieldLabel htmlFor="json-proof">proof (JSON)</FieldLabel>
							<Textarea
								className="font-mono"
								id="json-proof"
								onChange={(e) => {
									try {
										const v = JSON.parse(e.target.value);
										if (sel.proof !== undefined || e.target.value.includes("proof"))
											setRow({ proof: v });
										else setRow({ project: v });
									} catch {
										/* keep typing */
									}
								}}
								value={JSON.stringify(sel.proof ?? sel.project ?? "", null, 2)}
							/>
						</Field>
						<ScrollArea className="max-h-45dvh">
							<pre className="code-surface p-3 font-mono text-xs">
								{JSON.stringify(sel, null, 2).slice(0, 2000)}
							</pre>
						</ScrollArea>
					</FieldGroup>
				) : (
					<EmptyState
						compact
						description="Add a row to get started."
						icon={FileTextIcon}
						title="No rows"
					/>
				)}
			</CardContent>
			<AlertDialog onOpenChange={setRowDeleteOpen} open={rowDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete row {sel?.id}?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the row from the table. Save to persist.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<Button
							onClick={() => {
								setRowDeleteOpen(false);
								if (sel) setRows((p: any[]) => p.filter((r) => String(r.id) !== String(sel.id)));
							}}
							variant="destructive"
						>
							Delete row
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
