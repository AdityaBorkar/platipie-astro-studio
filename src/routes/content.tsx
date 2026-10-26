import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import {
	BracesIcon,
	ChevronRightIcon,
	CopyIcon,
	FileCode2Icon,
	FileTextIcon,
	FolderIcon,
	FolderOpenIcon,
	FolderTreeIcon,
	RefreshCwIcon,
	SearchIcon,
	SlidersHorizontalIcon,
	SquarePenIcon,
	XIcon,
} from "lucide-react";
import { marked } from "marked";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FileTypeIcon } from "#/components/file-type-icon";
import { Hint } from "#/components/gitbook/hint";
import { EmptyState } from "#/components/gitbook/page";
import { LiveBadge } from "#/components/live-badge";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { cn } from "#/lib/utils";

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

interface ContentIndex extends CollectionsResponse {
	entries: Record<string, RecentEntry[]>;
}

interface LoadedEntry {
	body: string;
	frontmatter: Record<string, unknown>;
	hasFrontmatter: boolean;
	mtime: number;
	readOnly?: boolean;
	readOnlyReason?: string;
	ref: { collection: string; path: string };
}

interface CollectionGroup {
	collection: CollectionSummary;
	entries: RecentEntry[];
}

interface MetaRow {
	label: string;
	value: string;
}

const CONTENT_INDEX_KEY = "/api/cms/collections?expand=entries";

export const Route = createFileRoute("/content")({
	component: ContentPage,
	head: () => ({ meta: [{ title: "Content · platipie-cms" }] }),
});

function entryExt(repoPath: string): string {
	const file = repoPath.split("#")[0] ?? "";
	const dot = file.lastIndexOf(".");
	return dot >= 0 ? file.slice(dot) : "";
}

function entryKind(ext: string): string {
	if (ext === ".md" || ext === ".mdx") return "markdown";
	if (ext === ".json") return "json";
	if (ext === ".ts") return "ts";
	return ext.replace(/^\./u, "") || "file";
}

function asDisplayString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function entryTitle(entry: RecentEntry, loaded: LoadedEntry | null): string {
	return asDisplayString(loaded?.frontmatter.title) ?? entry.title ?? entry.id;
}

function jsonRowTitle(
	row: Record<string, unknown> | null,
	entry: RecentEntry,
	loaded: LoadedEntry | null,
): string {
	for (const key of ["title", "name"]) {
		const value = row?.[key];
		if (typeof value === "string" && value.trim().length > 0) return value;
	}
	return entryTitle(entry, loaded);
}

function entryDescription(loaded: LoadedEntry | null): string | null {
	if (!loaded) return null;
	return (
		asDisplayString(loaded.frontmatter.description) ?? asDisplayString(loaded.frontmatter.excerpt)
	);
}

function entryStatus(loaded: LoadedEntry | null): string | null {
	return asDisplayString(loaded?.frontmatter.status);
}

function entryDate(loaded: LoadedEntry | null): string | null {
	if (!loaded) return null;
	return (
		asDisplayString(loaded.frontmatter.publishDate) ?? asDisplayString(loaded.frontmatter.date)
	);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "string") return value.trim().length > 0 ? value : "—";
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return "—";
		const scalar = value.every(
			(item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean",
		);
		return scalar ? value.join(", ") : (JSON.stringify(value, null, 2) ?? "—");
	}
	if (typeof value === "object") return JSON.stringify(value, null, 2) ?? "—";
	return String(value);
}

function matchesNeedle(entry: RecentEntry, needle: string): boolean {
	return (
		entry.id.toLowerCase().includes(needle) ||
		(entry.title ?? "").toLowerCase().includes(needle) ||
		entry.path.toLowerCase().includes(needle)
	);
}

function buildGroups(data: ContentIndex, needle: string): CollectionGroup[] {
	return data.collections
		.map((collection) => {
			const entries = data.entries[collection.id] ?? [];
			const collectionMatches =
				collection.label.toLowerCase().includes(needle) ||
				collection.source.toLowerCase().includes(needle);
			const visible =
				!needle || collectionMatches
					? entries
					: entries.filter((entry) => matchesNeedle(entry, needle));
			return { collection, entries: visible };
		})
		.filter((group) => !needle || group.entries.length > 0);
}

function firstEntry(data: ContentIndex): RecentEntry | null {
	for (const collection of data.collections) {
		const entry = data.entries[collection.id]?.[0];
		if (entry) return entry;
	}
	return null;
}

async function fetchContentIndex(): Promise<ContentIndex> {
	const base = await fetchJson<CollectionsResponse>("/api/cms/collections");
	const pairs = await Promise.all(
		base.collections.map(async (collection) => {
			try {
				const json = await fetchJson<{ entries?: RecentEntry[] }>(
					`/api/cms/entries?collection=${encodeURIComponent(collection.id)}`,
				);
				return [collection.id, json.entries ?? []] as const;
			} catch {
				return [collection.id, []] as const;
			}
		}),
	);
	return { ...base, entries: Object.fromEntries(pairs) };
}

function ValueBlock({ compact = false, value }: { compact?: boolean; value: unknown }) {
	const text = formatValue(value);
	if (text.includes("\n")) {
		return (
			<pre
				className={cn(
					"code-surface mt-1 overflow-auto whitespace-pre-wrap",
					compact ? "p-2 font-mono text-10" : "p-3 font-mono text-11",
				)}
			>
				{text}
			</pre>
		);
	}
	return (
		<span
			className={
				compact
					? "text-11 leading-relaxed wrap-break-word"
					: "text-13 leading-relaxed wrap-break-word"
			}
		>
			{text}
		</span>
	);
}

function FolderSection({
	collapsed,
	group,
	onSelect,
	onToggle,
	searching,
	selectedPath,
}: {
	collapsed: boolean;
	group: CollectionGroup;
	onSelect: (entry: RecentEntry) => void;
	onToggle: (id: string) => void;
	searching: boolean;
	selectedPath: string | null;
}) {
	const open = searching || !collapsed;
	const count = group.entries.length;

	return (
		<div className="scroll-mt-3" data-collection-id={group.collection.id}>
			<button
				aria-expanded={open}
				className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40"
				onClick={() => {
					if (searching) return;
					const opening = collapsed;
					onToggle(group.collection.id);
					const first = group.entries[0];
					if (opening && first) onSelect(first);
				}}
				type="button"
			>
				<ChevronRightIcon
					className={cn(
						"size-3 shrink-0 text-muted-foreground transition-transform",
						open && "rotate-90",
					)}
				/>
				{open ? (
					<FolderOpenIcon className="size-3.5 shrink-0 text-brand" />
				) : (
					<FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
				)}
				<span className="min-w-0 flex-1">
					<span className="block truncate text-12 font-semibold">{group.collection.label}</span>
					<span className="block truncate font-mono text-9 text-muted-foreground">
						{group.collection.source}
					</span>
				</span>
				<span className="font-mono text-10 text-muted-foreground">{count}</span>
			</button>

			{open && count === 0 ? (
				<p className="pl-9 text-10 text-muted-foreground">No entries</p>
			) : null}

			{open && count > 0 ? (
				<ul className="mt-0.5 ml-4 grid gap-0.5 border-l border-border/70 pl-2">
					{group.entries.map((entry) => {
						const selected = entry.path === selectedPath;
						return (
							<li key={entry.path}>
								<button
									aria-pressed={selected}
									className={cn(
										"flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
										selected ? "bg-card ring-1 ring-border" : "hover:bg-muted/70",
									)}
									onClick={() => onSelect(entry)}
									type="button"
								>
									<FileTypeIcon
										className={selected ? "text-brand" : "text-muted-foreground"}
										ext={entryExt(entry.path)}
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-13 font-semibold">
											{entry.title ?? entry.id}
										</span>
										<span className="block truncate font-mono text-9 text-muted-foreground">
											{entry.id}
										</span>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			) : null}
		</div>
	);
}

function PreviewStage({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative flex h-full min-h-80 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
			<div aria-hidden="true" className="gb-dotgrid absolute inset-0 opacity-60" />
			<div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
		</div>
	);
}

function EntryPreview({
	collectionLabel,
	description,
	entry,
	error,
	isLoading,
	jsonIndex,
	jsonRow,
	loaded,
	title,
}: {
	collectionLabel: string | null;
	description: string | null;
	entry: RecentEntry | null;
	error: string | null;
	isLoading: boolean;
	jsonIndex: number;
	jsonRow: Record<string, unknown> | null;
	loaded: LoadedEntry | null;
	title: string | null;
}) {
	const ext = entry ? entryExt(entry.path) : "";
	const isMarkdown = ext === ".md" || ext === ".mdx";
	const isJson = ext === ".json";
	const previewHtml = useMemo(() => {
		if (!loaded || !isMarkdown) return "";
		try {
			return marked.parse(loaded.body ?? "") as string;
		} catch {
			return "";
		}
	}, [isMarkdown, loaded]);

	const status = entryStatus(loaded);
	const date = entryDate(loaded);

	if (!entry) {
		return (
			<PreviewStage>
				<div className="grid h-full place-items-center">
					<EmptyState
						description="Pick a collection entry from the tree to preview it here."
						icon={FolderTreeIcon}
						title="Nothing selected"
					/>
				</div>
			</PreviewStage>
		);
	}

	if (error && !loaded) {
		return (
			<PreviewStage>
				<Hint title="Could not load this entry" variant="danger">
					{error}
				</Hint>
			</PreviewStage>
		);
	}

	if (isLoading) {
		return (
			<PreviewStage>
				<div className="mx-auto grid w-page-narrow gap-3">
					<Skeleton className="h-8 w-2/3" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
					<Skeleton className="mt-3 h-40 w-full" />
				</div>
			</PreviewStage>
		);
	}

	if (!loaded) {
		return (
			<PreviewStage>
				<EmptyState
					description="The source file could not be read. Try re-syncing the content model."
					icon={FileTextIcon}
					title="No preview available"
				/>
			</PreviewStage>
		);
	}

	if (isMarkdown) {
		return (
			<PreviewStage>
				<article className="prose-preview mx-auto w-page-narrow">
					<header className="mb-5 border-b border-border pb-4">
						<h1 className="gb-display">{title ?? entry.id}</h1>
						{description ? (
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
						) : null}
						<div className="mt-3 flex flex-wrap items-center gap-1.5">
							{collectionLabel ? <Badge variant="brand">{collectionLabel}</Badge> : null}
							{status ? (
								<Badge variant={status === "published" ? "success" : "secondary"}>{status}</Badge>
							) : null}
							{date ? (
								<Badge className="font-mono" variant="outline">
									{date}
								</Badge>
							) : null}
						</div>
					</header>
					{previewHtml ? (
						<div dangerouslySetInnerHTML={{ __html: previewHtml }} />
					) : (
						<p className="text-sm text-muted-foreground">This entry has no body yet.</p>
					)}
				</article>
			</PreviewStage>
		);
	}

	if (isJson) {
		return (
			<PreviewStage>
				<article className="prose-preview mx-auto w-page-narrow">
					<header className="border-b border-border pb-3">
						<h1 className="gb-display">{title ?? entry.id}</h1>
						<p className="mt-1 font-mono text-10 text-muted-foreground">
							row {jsonIndex >= 0 ? jsonIndex + 1 : "—"} · {entry.path}
						</p>
					</header>
					{jsonRow ? (
						<dl className="mt-4 grid gap-3">
							{Object.entries(jsonRow).map(([key, value]) => (
								<div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2" key={key}>
									<dt className="font-mono text-9 tracking-12 text-muted-foreground uppercase">
										{key}
									</dt>
									<dd className="mt-1">
										<ValueBlock value={value} />
									</dd>
								</div>
							))}
						</dl>
					) : (
						<EmptyState
							className="mt-4"
							compact
							description="The selected row no longer exists in the JSON file."
							icon={BracesIcon}
							title="Row not found"
						/>
					)}
				</article>
			</PreviewStage>
		);
	}

	return (
		<PreviewStage>
			<article className="mx-auto w-page-narrow overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
				<header className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
					<FileCode2Icon className="size-4 text-brand" />
					<span className="min-w-0 flex-1 truncate font-mono text-10 text-muted-foreground">
						{entry.path}
					</span>
					<Badge className="font-mono" variant="outline">
						{entryKind(ext)}
					</Badge>
				</header>
				<pre className="code-surface max-h-full overflow-auto p-4 font-mono text-11 leading-relaxed whitespace-pre">
					{loaded.body}
				</pre>
			</article>
		</PreviewStage>
	);
}

function PropertiesRail({
	collectionLabel,
	entry,
	error,
	fields,
	fieldsLabel,
	isLoading,
	loaded,
	onCopyPath,
}: {
	collectionLabel: string | null;
	entry: RecentEntry | null;
	error: string | null;
	fields: [string, unknown][];
	fieldsLabel: string;
	isLoading: boolean;
	loaded: LoadedEntry | null;
	onCopyPath: () => void;
}) {
	if (!entry) {
		return (
			<div className="p-4">
				<EmptyState
					compact
					description="Select an entry to inspect its source paths and structured fields."
					icon={SlidersHorizontalIcon}
					title="No properties yet"
				/>
			</div>
		);
	}

	const ext = entryExt(entry.path);
	const status = entryStatus(loaded);
	const metaRows: MetaRow[] = [
		{ label: "Collection", value: collectionLabel ?? entry.collection },
		{ label: "Entry", value: entry.id },
		{ label: "Path", value: entry.path },
		{ label: "Kind", value: entryKind(ext) },
		{ label: "Modified", value: new Date(entry.mtime).toLocaleString() },
	];
	if (status) metaRows.push({ label: "Status", value: status });
	if (loaded?.readOnly) {
		metaRows.push({ label: "Access", value: loaded.readOnlyReason ?? "read-only" });
	}

	return (
		<>
			<header className="border-b border-border/70 p-4">
				<div className="flex items-center gap-2">
					<SlidersHorizontalIcon className="size-4 text-brand" />
					<h2 className="text-sm font-bold tracking-heading">Properties</h2>
					<Badge className="ml-auto font-mono" variant="outline">
						{entryKind(ext)}
					</Badge>
				</div>
				<p className="mt-1.5 text-11 leading-relaxed text-muted-foreground">
					Read-only projection of the source file. Open the editor to change it.
				</p>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<section className="border-b border-border/70 p-4">
					<div className="flex items-center gap-2">
						<FileTextIcon className="size-4 text-brand" />
						<h3 className="text-sm font-bold tracking-heading">File</h3>
					</div>
					<dl className="mt-3 grid gap-2.5 text-11">
						{metaRows.map((row) => (
							<div className="grid grid-cols-page-meta items-start gap-2" key={row.label}>
								<dt className="text-muted-foreground">{row.label}</dt>
								<dd className="font-mono break-all">{row.value}</dd>
							</div>
						))}
					</dl>
				</section>

				<section className="p-4">
					<div className="flex items-center gap-2">
						<BracesIcon className="size-4 text-brand" />
						<h3 className="text-sm font-bold tracking-heading">{fieldsLabel}</h3>
						<Badge className="ml-auto font-mono" variant="outline">
							{fields.length}
						</Badge>
					</div>

					{isLoading ? (
						<div className="mt-3 grid gap-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-3/4" />
						</div>
					) : error && !loaded ? (
						<Hint className="mt-3" title="Could not load fields" variant="danger">
							{error}
						</Hint>
					) : fields.length === 0 ? (
						<EmptyState
							className="mt-3"
							compact
							description={
								fieldsLabel === "Row fields"
									? "The selected JSON row has no fields."
									: "This entry has no structured fields."
							}
							icon={BracesIcon}
							title="No fields"
						/>
					) : (
						<dl className="mt-3 grid gap-3">
							{fields.map(([name, value]) => (
								<div
									className="grid gap-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0"
									key={name}
								>
									<dt className="font-mono text-9 tracking-12 text-muted-foreground uppercase">
										{name}
									</dt>
									<dd>
										<ValueBlock compact value={value} />
									</dd>
								</div>
							))}
						</dl>
					)}
				</section>
			</div>

			<footer className="flex items-center gap-2 border-t border-border/70 px-4 py-3">
				<Button
					className="flex-1"
					nativeButton={false}
					render={
						<Link
							params={{
								collection: entry.collection,
								id: encodeURIComponent(entry.id),
							}}
							search={{ path: entry.path }}
							to="/edit/$collection/$id"
						/>
					}
					size="sm"
				>
					<SquarePenIcon />
					Open editor
				</Button>
				<Button aria-label="Copy entry path" onClick={onCopyPath} size="icon-sm" variant="outline">
					<CopyIcon />
				</Button>
			</footer>
		</>
	);
}

function ContentPage() {
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const [syncing, setSyncing] = useState(false);
	const routerHref = useRouterState({ select: (state) => state.location.href });
	const handledHash = useRef<string | null>(null);
	const selectedPathRef = useRef<string | null>(null);
	const treeRef = useRef<HTMLDivElement | null>(null);

	const fetchIndex = useCallback(() => fetchContentIndex(), []);
	const contentQuery = useCachedFetch(CONTENT_INDEX_KEY, fetchIndex, {
		errorMessage: "Could not refresh content",
	});
	const bundle = contentQuery.data;
	const error = bundle === null ? contentQuery.error : null;
	const refreshing = contentQuery.isRefreshing || syncing;

	const needle = query.trim().toLowerCase();
	const groups = useMemo(() => (bundle ? buildGroups(bundle, needle) : []), [bundle, needle]);
	const totalEntries = useMemo(
		() =>
			bundle ? Object.values(bundle.entries).reduce((sum, entries) => sum + entries.length, 0) : 0,
		[bundle],
	);
	const visibleEntryCount = groups.reduce((sum, group) => sum + group.entries.length, 0);
	const collectionCount = bundle?.collections.length ?? 0;

	useEffect(() => {
		if (!bundle) return;
		const exists =
			selectedPath !== null &&
			Object.values(bundle.entries).some((entries) =>
				entries.some((entry) => entry.path === selectedPath),
			);
		if (exists) return;
		const first = firstEntry(bundle);
		selectedPathRef.current = first?.path ?? null;
		setSelectedPath(first?.path ?? null);
		setCollapsed((current) => {
			const next = new Set(current);
			for (const collection of bundle.collections) {
				if (collection.id !== first?.collection) next.add(collection.id);
			}
			return next;
		});
	}, [bundle, selectedPath]);

	const selectedEntry = useMemo(() => {
		if (!bundle || !selectedPath) return null;
		for (const collection of bundle.collections) {
			const found = bundle.entries[collection.id]?.find((entry) => entry.path === selectedPath);
			if (found) return found;
		}
		return null;
	}, [bundle, selectedPath]);

	useEffect(() => {
		if (!selectedEntry) return;
		setCollapsed((current) => {
			if (!current.has(selectedEntry.collection)) return current;
			const next = new Set(current);
			next.delete(selectedEntry.collection);
			return next;
		});
	}, [selectedEntry]);

	useEffect(() => {
		const hashAt = routerHref.indexOf("#");
		const hash = hashAt >= 0 ? routerHref.slice(hashAt + 1) : "";
		if (!hash) {
			handledHash.current = null;
			return;
		}
		if (!bundle || handledHash.current === hash) return;
		const collection = bundle.collections.find((entry) => entry.id === hash);
		if (!collection) return;
		handledHash.current = hash;
		setQuery("");
		setCollapsed((current) => {
			const next = new Set(current);
			for (const item of bundle.collections) next.add(item.id);
			next.delete(hash);
			return next;
		});
		const entries = bundle.entries[hash] ?? [];
		if (entries[0] && !entries.some((entry) => entry.path === selectedPathRef.current)) {
			selectedPathRef.current = entries[0].path;
			setSelectedPath(entries[0].path);
		}

		const frame = requestAnimationFrame(() => {
			const scroller = treeRef.current;
			const target = document.querySelector<HTMLElement>(`[data-collection-id="${hash}"]`);
			if (!scroller || !target) return;
			const top =
				target.getBoundingClientRect().top -
				scroller.getBoundingClientRect().top +
				scroller.scrollTop;
			scroller.scrollTo({ top: Math.max(0, top - 12) });
		});
		return () => cancelAnimationFrame(frame);
	}, [bundle, routerHref]);

	const activeCollection = selectedEntry
		? (bundle?.collections.find((collection) => collection.id === selectedEntry.collection) ?? null)
		: null;

	const entryFile = selectedEntry ? (selectedEntry.path.split("#")[0] ?? null) : null;
	const entryKey = entryFile
		? `/api/cms/entry?path=${encodeURIComponent(entryFile)}`
		: "content:entry:none";
	const fetchEntry = useCallback(() => {
		if (!entryFile) return Promise.reject(new Error("No entry selected"));
		return fetchJson<LoadedEntry>(`/api/cms/entry?path=${encodeURIComponent(entryFile)}`);
	}, [entryFile]);
	const entryQuery = useCachedFetch<LoadedEntry>(entryKey, fetchEntry, {
		enabled: entryFile !== null,
		errorMessage: "Could not refresh entry",
		toastOnBackgroundError: false,
	});
	const loaded = entryQuery.data;
	const entryError = loaded === null ? entryQuery.error : null;
	const entryLoading = loaded === null && entryQuery.isLoading;

	const ext = selectedEntry ? entryExt(selectedEntry.path) : "";
	const isJsonEntry = ext === ".json";

	const jsonIndex = useMemo(() => {
		if (!bundle || !selectedEntry) return -1;
		return (bundle.entries[selectedEntry.collection] ?? []).findIndex(
			(entry) => entry.path === selectedEntry.path,
		);
	}, [bundle, selectedEntry]);

	const jsonRow = useMemo((): Record<string, unknown> | null => {
		if (!loaded || !isJsonEntry) return null;
		try {
			const parsed: unknown = JSON.parse(loaded.body);
			if (!Array.isArray(parsed)) return null;
			const candidate = parsed[jsonIndex];
			return isPlainRecord(candidate) ? candidate : null;
		} catch {
			return null;
		}
	}, [isJsonEntry, jsonIndex, loaded]);

	const fields = useMemo<[string, unknown][]>(() => {
		if (!selectedEntry || !loaded) return [];
		if (isJsonEntry) return jsonRow ? Object.entries(jsonRow) : [];
		return Object.entries(loaded.frontmatter);
	}, [isJsonEntry, jsonRow, loaded, selectedEntry]);

	const title = useMemo(() => {
		if (!selectedEntry) return null;
		if (isJsonEntry) return jsonRowTitle(jsonRow, selectedEntry, loaded);
		return entryTitle(selectedEntry, loaded);
	}, [isJsonEntry, jsonRow, loaded, selectedEntry]);
	const description = selectedEntry && !isJsonEntry ? entryDescription(loaded) : null;

	let fieldsLabel = "Frontmatter";
	if (isJsonEntry) fieldsLabel = "Row fields";
	else if (ext === ".ts") fieldsLabel = "Source fields";

	const headerTitle = title ?? selectedEntry?.title ?? selectedEntry?.id ?? "No selection";

	function toggleCollection(id: string) {
		setCollapsed((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				for (const collection of bundle?.collections ?? []) next.add(collection.id);
				next.delete(id);
				return next;
			}
			next.add(id);
			return next;
		});
	}

	function selectEntry(entry: RecentEntry) {
		selectedPathRef.current = entry.path;
		setSelectedPath(entry.path);
		if (window.location.hash !== `#${entry.collection}`) {
			handledHash.current = entry.collection;
			window.location.hash = entry.collection;
		}
	}

	async function resync() {
		setSyncing(true);
		try {
			const json = await fetchJson<{ fileCount: number }>("/api/cms/sync", {
				body: JSON.stringify({ scope: "content" }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			toast.success(`Content re-synced (${json.fileCount} files)`);
			contentQuery.refresh();
			entryQuery.refresh();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			setSyncing(false);
		}
	}

	async function copyPath() {
		if (!selectedEntry) return;
		try {
			await navigator.clipboard.writeText(selectedEntry.path);
			toast.success("Entry path copied");
		} catch {
			toast.error("Could not copy the entry path");
		}
	}

	return (
		<div className="min-h-dvh lg:grid lg:grid-cols-docs-shell xl:h-dvh xl:grid-cols-workbench xl:overflow-hidden">
			<aside className="flex flex-col border-b border-border/70 bg-sidebar/40 lg:sticky lg:top-0 lg:row-span-2 lg:h-dvh lg:self-start lg:border-r lg:border-b-0 xl:static xl:row-span-1">
				<div className="border-b border-border/70 p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="text-11 font-bold tracking-14 text-brand uppercase">Content</p>
							<h1 className="mt-1 text-sm font-bold tracking-heading">Collection tree</h1>
						</div>
						<Button
							aria-label="Re-sync content"
							disabled={syncing}
							onClick={() => void resync()}
							size="icon-sm"
							title="Re-sync content"
							variant="outline"
						>
							<RefreshCwIcon className={cn("size-3.5", syncing && "animate-spin")} />
						</Button>
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-1.5">
						{bundle ? (
							<>
								<Badge
									className="font-mono"
									variant={bundle.env.projectReachable ? "success" : "destructive"}
								>
									Project {bundle.env.projectReachable ? "reachable" : "missing"}
								</Badge>
								{bundle.drift.length > 0 ? (
									<Badge variant="brand">{bundle.drift.length} drift</Badge>
								) : null}
							</>
						) : null}
						<LiveBadge refreshing={refreshing} />
					</div>
				</div>

				<div className="border-b border-border/70 px-3 py-2">
					<div className="relative">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							aria-label="Search content entries"
							className="h-8 px-8 text-13"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Filter entries…"
							value={query}
						/>
						{query ? (
							<button
								aria-label="Clear search"
								className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
								onClick={() => setQuery("")}
								type="button"
							>
								<XIcon className="size-3" />
							</button>
						) : null}
					</div>
				</div>

				<div
					className="flex max-h-72 min-h-0 flex-col overflow-y-auto px-2 py-3 lg:max-h-none lg:flex-1"
					ref={treeRef}
				>
					<div className="flex items-center justify-between gap-2 px-2 pb-2">
						<div className="flex min-w-0 items-center gap-1.5">
							<FolderTreeIcon className="size-3.5 shrink-0 text-brand" />
							<span className="truncate text-11 font-bold tracking-12 text-muted-foreground uppercase">
								Collections
							</span>
						</div>
						<Badge className="font-mono" variant="secondary">
							{visibleEntryCount}
						</Badge>
					</div>

					{error ? (
						<Hint className="m-2" title="Content unavailable" variant="danger">
							{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
						</Hint>
					) : null}

					{bundle === null && !error ? (
						<div className="grid gap-2 p-2">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : null}

					{bundle !== null && groups.length > 0 ? (
						<div className="grid gap-2">
							{groups.map((group) => (
								<FolderSection
									collapsed={collapsed.has(group.collection.id)}
									group={group}
									key={group.collection.id}
									onSelect={selectEntry}
									onToggle={toggleCollection}
									searching={needle.length > 0}
									selectedPath={selectedPath}
								/>
							))}
						</div>
					) : null}

					{bundle !== null && groups.length === 0 ? (
						<EmptyState
							className="m-2"
							compact
							description={
								needle ? "Try a different title, id, or path." : "Add content to the project."
							}
							icon={needle ? SearchIcon : FolderTreeIcon}
							title={needle ? "No matches" : "No collections"}
						/>
					) : null}
				</div>

				<footer className="border-t border-border/70 px-3 py-2">
					<div className="flex items-center gap-2">
						<span className="min-w-0 flex-1 truncate font-mono text-9 text-muted-foreground">
							{collectionCount} collections · {totalEntries} entries
						</span>
						<Button nativeButton={false} render={<Link to="/settings" />} size="xs" variant="ghost">
							Settings
						</Button>
					</div>
				</footer>
			</aside>

			<section className="flex min-h-96 flex-col border-b border-border/70 lg:border-b-0 xl:min-h-0">
				<header className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
					<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
						{selectedEntry ? (
							<FileTypeIcon className="size-4" ext={entryExt(selectedEntry.path)} />
						) : (
							<FolderTreeIcon className="size-4" />
						)}
					</span>
					<span className="min-w-0 flex-1">
						<span className="flex min-w-0 items-center gap-1.5">
							<h2 className="truncate text-13 font-bold tracking-tight">{headerTitle}</h2>
							{activeCollection ? <Badge variant="brand">{activeCollection.label}</Badge> : null}
							{loaded?.readOnly ? <Badge variant="destructive">read-only</Badge> : null}
						</span>
						<span className="mt-0.5 block truncate font-mono text-10 text-muted-foreground">
							{selectedEntry?.path ?? "Choose an entry from the tree"}
						</span>
					</span>
					{selectedEntry ? (
						<Button
							className="shrink-0"
							nativeButton={false}
							render={
								<Link
									params={{
										collection: selectedEntry.collection,
										id: encodeURIComponent(selectedEntry.id),
									}}
									search={{ path: selectedEntry.path }}
									to="/edit/$collection/$id"
								/>
							}
							size="sm"
							variant="outline"
						>
							<SquarePenIcon className="size-3.5" />
							Open editor
						</Button>
					) : null}
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<EntryPreview
						collectionLabel={activeCollection?.label ?? null}
						description={description}
						entry={selectedEntry}
						error={entryError}
						isLoading={entryLoading}
						jsonIndex={jsonIndex}
						jsonRow={jsonRow}
						loaded={loaded}
						title={title}
					/>
				</div>
			</section>

			<aside className="flex min-h-0 flex-col border-border/70 bg-sidebar/30 lg:border-t xl:h-dvh xl:border-t-0 xl:border-l">
				<PropertiesRail
					collectionLabel={activeCollection?.label ?? null}
					entry={selectedEntry}
					error={entryError}
					fields={fields}
					fieldsLabel={fieldsLabel}
					isLoading={entryLoading}
					loaded={loaded}
					onCopyPath={() => void copyPath()}
				/>
			</aside>
		</div>
	);
}
