import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderTreeIcon, RefreshCwIcon, SearchIcon, SquarePenIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FileTypeIcon } from "#/components/file-type-icon";
import { Hint } from "#/components/gitbook/hint";
import { EmptyState } from "#/components/gitbook/page";
import { LiveBadge } from "#/components/live-badge";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { cn } from "#/lib/utils";
import { WorkbenchShell } from "./_workbench-shell";
import { cmsKeys } from "./cms-keys";
import type { LoadedEntry, RecentEntry } from "./content/model";
import {
	buildGroups,
	entryExt,
	fetchContentIndex,
	firstEntry,
	fmStr,
	rowForIndex,
} from "./content/model";
import {
	EntryPreview,
	EntryPreviewSkeleton,
	NoPreview,
	NothingSelected,
	PreviewStage,
} from "./content/preview";
import { PropertiesRail } from "./content/rail";
import { CollectionTreeHeader, CollectionTreeSkeleton, FolderSection } from "./content/tree";
import { parseEntryRef } from "./edit/helpers";

export const Route = createFileRoute("/content")({
	component: ContentPage,
	head: () => ({ meta: [{ title: "Content · platipie-astro-studio" }] }),
	validateSearch: (s: Record<string, unknown>) => ({
		collection: typeof s.collection === "string" ? s.collection : undefined,
		entry: typeof s.entry === "string" ? s.entry : undefined,
	}),
});

function ContentPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const [query, setQuery] = useState("");
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const [syncing, setSyncing] = useState(false);

	const contentQuery = useCachedFetch(cmsKeys.contentIndex, fetchContentIndex, {
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

	// Legacy `#collection` hashes still select the matching collection until the
	// search params take over. No refs, no rAF scrolling, no competing effects.
	// DEPRECATED legacy path: validateSearch (`?collection=`/`?entry=`) is the
	// primary selector; the hash fallback stays only for old bookmarks.
	const hashCollection = useMemo(() => {
		if (search.collection ?? search.entry) return null;
		if (typeof window === "undefined") return null;
		const hash = window.location.hash.slice(1);
		return hash.length > 0 ? hash : null;
	}, [search.collection, search.entry]);
	const preferredCollection = search.collection ?? hashCollection ?? undefined;

	const effectivePath = useMemo(() => {
		if (!bundle) return null;
		if (search.entry) {
			const known = bundle.collections.some((collection) =>
				(bundle.entries[collection.id] ?? []).some((entry) => entry.path === search.entry),
			);
			if (known) return search.entry;
		}
		return firstEntry(bundle, preferredCollection)?.path ?? null;
	}, [bundle, preferredCollection, search.entry]);

	const selectedEntry = useMemo(() => {
		if (!bundle || !effectivePath) return null;
		for (const collection of bundle.collections) {
			const found = bundle.entries[collection.id]?.find((entry) => entry.path === effectivePath);
			if (found) return found;
		}
		return null;
	}, [bundle, effectivePath]);

	useEffect(() => {
		if (!selectedEntry) return;
		setCollapsed((current) => {
			if (!current.has(selectedEntry.collection)) return current;
			const next = new Set(current);
			next.delete(selectedEntry.collection);
			return next;
		});
	}, [selectedEntry]);

	const activeCollection = selectedEntry
		? (bundle?.collections.find((collection) => collection.id === selectedEntry.collection) ?? null)
		: null;

	const entryFile = selectedEntry ? parseEntryRef(selectedEntry.path).fp : null;
	const entryKey = entryFile ? cmsKeys.entry(entryFile) : cmsKeys.entryFallback;
	const fetchEntry = useCallback(() => {
		if (!entryFile) return Promise.reject(new Error("No entry selected"));
		return fetchJson<LoadedEntry>(cmsKeys.entry(entryFile));
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
		return rowForIndex(loaded.body, jsonIndex);
	}, [isJsonEntry, jsonIndex, loaded]);

	const fields = useMemo<[string, unknown][]>(() => {
		if (!selectedEntry || !loaded) return [];
		if (isJsonEntry) return jsonRow ? Object.entries(jsonRow) : [];
		return Object.entries(loaded.frontmatter);
	}, [isJsonEntry, jsonRow, loaded, selectedEntry]);

	let fieldsLabel = "Frontmatter";
	if (isJsonEntry) fieldsLabel = "Row fields";
	else if (ext === ".ts") fieldsLabel = "Source fields";

	const headerTitle = useMemo(() => {
		if (!selectedEntry) return "No selection";
		if (isJsonEntry) {
			for (const key of ["title", "name"]) {
				const value = fmStr(jsonRow ?? undefined, key);
				if (value) return value;
			}
		}
		return fmStr(loaded?.frontmatter, "title") ?? selectedEntry.title ?? selectedEntry.id;
	}, [isJsonEntry, jsonRow, loaded, selectedEntry]);

	// Independent toggles: expanding/collapsing one collection never touches the
	// others. (A previous revision added every collection to `collapsed` when
	// reopening one, forcing accordion-exclusive behaviour.)
	function toggleCollection(id: string) {
		setCollapsed((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				// KEEP auto-expand on selection (see the selectedEntry effect above
				// and FolderSection auto-select): picking an entry from search or a
				// deep link re-opens its collection, so explicit toggles stay
				// independent while navigation never strands the user on a closed
				// folder.
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	function selectEntry(entry: RecentEntry) {
		void navigate({ search: { collection: entry.collection, entry: entry.path } });
	}

	async function resync() {
		setSyncing(true);
		try {
			const json = await fetchJson<{ fileCount: number }>(cmsKeys.sync, {
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
		<WorkbenchShell
			rail={
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
			}
			sidebar={
				<>
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

					<div className="flex max-h-72 min-h-0 flex-col overflow-y-auto px-2 py-3 lg:max-h-none lg:flex-1">
						<CollectionTreeHeader count={visibleEntryCount} />

						{error ? (
							<Hint className="m-2" title="Content unavailable" variant="danger">
								{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
							</Hint>
						) : null}

						{bundle === null && !error ? <CollectionTreeSkeleton /> : null}

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
										selectedPath={effectivePath}
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
							<Button
								nativeButton={false}
								render={<Link to="/settings" />}
								size="xs"
								variant="ghost"
							>
								Settings
							</Button>
						</div>
					</footer>
				</>
			}
			stage={
				<>
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
						{entryLoading ? (
							<EntryPreviewSkeleton />
						) : selectedEntry === null ? (
							<NothingSelected />
						) : loaded === null ? (
							entryError === null ? (
								<NoPreview />
							) : (
								<PreviewStage>
									<Hint title="Could not load this entry" variant="danger">
										{entryError}
									</Hint>
								</PreviewStage>
							)
						) : (
							<EntryPreview
								collectionLabel={activeCollection?.label ?? null}
								entry={selectedEntry}
								jsonIndex={jsonIndex}
								loaded={loaded}
							/>
						)}
					</div>
				</>
			}
		/>
	);
}
