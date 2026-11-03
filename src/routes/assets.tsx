import { createFileRoute } from "@tanstack/react-router";
import {
	ChevronRightIcon,
	FolderIcon,
	FolderOpenIcon,
	ImageIcon,
	LayoutGridIcon,
	ListTreeIcon,
	SearchIcon,
	UploadIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { toast } from "sonner";

import { AssetCard } from "#/components/assets/asset-card";
import { AssetPreviewDialog } from "#/components/assets/asset-preview-dialog";
import type { AssetRow, FolderNode } from "#/components/assets/types";
import {
	ASSET_ROOT,
	buildFolderTree,
	flattenFolders,
	folderCrumbs,
	matchesQuery,
} from "#/components/assets/utils";
import { Hint } from "#/components/gitbook/hint";
import { EmptyState, PageHeader, PageShell } from "#/components/gitbook/page";
import { LiveBadge } from "#/components/live-badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { cn } from "#/lib/utils";
import { cmsKeys } from "./cms-keys";

interface InventoryResponse {
	rows: AssetRow[];
	status: { fileCount: number; lastSync: number | null; scope: string }[];
}

type AssetView = "folders" | "free";

export const Route = createFileRoute("/assets")({
	component: AssetsPage,
	head: () => ({ meta: [{ title: "Assets · platipie-cms" }] }),
});

async function copyPath(path: string) {
	try {
		await navigator.clipboard.writeText(path);
		toast.success(`Copied ${path}`);
	} catch {
		toast.error("Clipboard unavailable");
	}
}

async function putAsset(file: File, slug?: string): Promise<string> {
	const form = new FormData();
	form.set("file", file);
	form.set("dest", "assets");
	if (slug) form.set("slug", slug);
	const response = await fetch(cmsKeys.media, { body: form, method: "POST" });
	const json = (await response.json().catch(() => ({}))) as {
		message?: string;
		path?: string;
	};
	if (!response.ok || !json.path) throw new Error(json.message ?? "Upload failed");
	return json.path;
}

function hasFiles(event: ReactDragEvent<HTMLDivElement>): boolean {
	return Array.from(event.dataTransfer.types).includes("Files");
}

function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
	if (!hasFiles(event)) return;
	event.preventDefault();
	event.dataTransfer.dropEffect = "copy";
}

function AssetsPage() {
	const [query, setQuery] = useState("");
	const [view, setView] = useState<AssetView>("free");
	const [currentDir, setCurrentDir] = useState(ASSET_ROOT);
	const [active, setActive] = useState<AssetRow | null>(null);
	const [uploading, setUploading] = useState(false);
	const [dragging, setDragging] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);
	const dragDepth = useRef(0);

	const fetchAssets = useCallback(
		() => fetchJson<InventoryResponse>(cmsKeys.inventory("assets")),
		[],
	);
	const assetsQuery = useCachedFetch(cmsKeys.inventory("assets"), fetchAssets, {
		errorMessage: "Could not refresh assets",
	});
	const assets = assetsQuery.data?.rows ?? null;
	const error = assets === null ? assetsQuery.error : null;

	const allAssets = useMemo(() => assets ?? [], [assets]);
	const needle = query.trim().toLowerCase();
	const filtered = useMemo(
		() => (needle ? allAssets.filter((item) => matchesQuery(item, needle)) : allAssets),
		[allAssets, needle],
	);

	const folderTree = useMemo(() => buildFolderTree(allAssets), [allAssets]);
	const folderIndex = useMemo(() => flattenFolders(folderTree), [folderTree]);
	const activeDir = folderIndex.has(currentDir) ? currentDir : ASSET_ROOT;
	const currentFolder = folderIndex.get(activeDir) ?? folderTree;
	const crumbs = useMemo(() => folderCrumbs(activeDir), [activeDir]);
	const folderRows = useMemo(
		() => allAssets.filter((item) => item.dir === activeDir),
		[activeDir, allAssets],
	);

	function goToFolder(path: string) {
		setCurrentDir(path);
		setQuery("");
	}

	async function uploadFiles(files: File[]) {
		if (files.length === 0) return;
		setUploading(true);
		try {
			const results = await Promise.allSettled(files.map((file) => putAsset(file)));
			const paths = results.flatMap((result) =>
				result.status === "fulfilled" ? [result.value] : [],
			);
			const failed = results.length - paths.length;
			if (paths.length === 1) toast.success(`Uploaded → ${paths[0]}`);
			else if (paths.length > 1) toast.success(`Uploaded ${paths.length} files`);
			if (failed > 0) {
				toast.error(`${failed} upload${failed === 1 ? "" : "s"} failed`);
			}
			if (paths.length > 0) assetsQuery.refresh();
		} finally {
			setUploading(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	function handleDragEnter(event: ReactDragEvent<HTMLDivElement>) {
		if (!hasFiles(event)) return;
		event.preventDefault();
		dragDepth.current += 1;
		setDragging(true);
	}

	function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
		event.preventDefault();
		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) setDragging(false);
	}

	function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
		event.preventDefault();
		dragDepth.current = 0;
		setDragging(false);
		const dropped = Array.from(event.dataTransfer.files);
		if (dropped.length === 0) return;
		const images = dropped.filter((file) => file.type.startsWith("image/"));
		const skipped = dropped.length - images.length;
		if (skipped > 0) {
			toast.error(`Skipped ${skipped} non-image file${skipped === 1 ? "" : "s"}`);
		}
		void uploadFiles(images);
	}

	return (
		<PageShell>
			<div
				className="relative"
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
			>
				<PageHeader
					actions={
						<>
							<input
								accept="image/*"
								className="sr-only"
								multiple
								onChange={(event) => {
									const files = event.target.files ? Array.from(event.target.files) : [];
									if (files.length > 0) void uploadFiles(files);
								}}
								ref={fileRef}
								type="file"
							/>
							<Button
								disabled={uploading}
								onClick={() => fileRef.current?.click()}
								size="sm"
								variant="outline"
							>
								<UploadIcon className="size-3.5" />
								{uploading ? "Uploading…" : "Upload"}
							</Button>
						</>
					}
					description={
						<>
							Every file under <code>assets/</code> in the Astro checkout, mirrored into the SQLite
							read-model by the FS watcher. Browse it flat or by folder, preview and crop, or drag
							images straight onto the page.
						</>
					}
					eyebrow="Assets"
					meta={<LiveBadge refreshing={assetsQuery.isRefreshing} />}
					title={
						<>
							The <span className="text-brand">assets directory,</span> in view.
						</>
					}
				/>

				{error ? (
					<Hint className="mt-4" title="Failed to load assets" variant="danger">
						{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
					</Hint>
				) : null}

				<Card className="mt-6 gap-3">
					<CardHeader className="gap-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-3">
								<CardTitle>Assets Viewer</CardTitle>
								<Tabs
									aria-label="Asset view"
									className="w-fit"
									onValueChange={(value) => setView(value as AssetView)}
									value={view}
								>
									<TabsList>
										<TabsTrigger value="free">
											<LayoutGridIcon className="size-3.5" />
											Free view
										</TabsTrigger>
										<TabsTrigger value="folders">
											<ListTreeIcon className="size-3.5" />
											Folder view
										</TabsTrigger>
									</TabsList>
								</Tabs>
							</div>
							<InputGroup className="w-full max-w-64">
								<InputGroupAddon>
									<SearchIcon />
								</InputGroupAddon>
								<InputGroupInput
									aria-label="Filter assets"
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Filter by path or kind…"
									value={query}
								/>
							</InputGroup>
						</div>
					</CardHeader>
					<CardContent>
						{assets === null ? (
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
								<Skeleton className="h-48 w-full" />
								<Skeleton className="h-48 w-full" />
								<Skeleton className="h-48 w-full" />
								<Skeleton className="h-48 w-full" />
							</div>
						) : view === "free" ? (
							filtered.length === 0 ? (
								<EmptyState
									compact
									description={
										needle
											? "Try another term, or switch to folder view to browse by directory."
											: "Drag images onto the page, or use Upload to add files."
									}
									icon={needle ? SearchIcon : ImageIcon}
									title={needle ? "No assets match" : "No assets yet"}
								/>
							) : (
								<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
									{filtered.map((item) => (
										<AssetCard
											asset={item}
											key={item.path}
											onCopy={(path) => void copyPath(path)}
											onOpen={(asset) => setActive(asset)}
										/>
									))}
								</ul>
							)
						) : (
							<div className="grid gap-4 md:grid-cols-asset-browser">
								<aside className="rounded-xl border border-border bg-muted/20 p-2">
									<p className="px-2 py-1 text-10 font-bold tracking-14 text-muted-foreground uppercase">
										Directories
									</p>
									<ul className="space-y-0.5">
										<FolderTreeNode activeDir={activeDir} node={folderTree} onSelect={goToFolder} />
									</ul>
								</aside>
								<section className="min-w-0">
									{needle ? (
										<div>
											<p className="text-xs text-muted-foreground">
												{filtered.length} result{filtered.length === 1 ? "" : "s"} across all
												folders
											</p>
											{filtered.length > 0 ? (
												<div className="mt-3">
													<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
														{filtered.map((item) => (
															<AssetCard
																asset={item}
																key={item.path}
																onCopy={(path) => void copyPath(path)}
																onOpen={(asset) => setActive(asset)}
															/>
														))}
													</ul>
												</div>
											) : (
												<div className="mt-3">
													<EmptyState
														compact
														description="Try another term, or clear the search to browse the current folder."
														icon={SearchIcon}
														title="No assets match"
													/>
												</div>
											)}
										</div>
									) : (
										<>
											<nav
												aria-label="Folder breadcrumb"
												className="flex flex-wrap items-center gap-1"
											>
												{crumbs.map((crumb, index) => (
													<span className="flex items-center gap-1" key={crumb.path}>
														{index > 0 ? (
															<ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" />
														) : null}
														<button
															className={cn(
																"rounded-full px-2 py-0.5 font-mono text-11 transition-colors",
																index === crumbs.length - 1
																	? "bg-secondary font-semibold text-foreground"
																	: "text-muted-foreground hover:bg-muted hover:text-foreground",
															)}
															onClick={() => goToFolder(crumb.path)}
															type="button"
														>
															{crumb.name}
														</button>
													</span>
												))}
											</nav>
											<p className="mt-2 font-mono text-10 text-muted-foreground">
												{currentFolder.total} file{currentFolder.total === 1 ? "" : "s"} ·{" "}
												{currentFolder.children.length} folder
												{currentFolder.children.length === 1 ? "" : "s"}
											</p>

											{currentFolder.children.length > 0 ? (
												<ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
													{currentFolder.children.map((folder) => (
														<li key={folder.path}>
															<button
																className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-card hover:border-foreground/20 hover:shadow-soft"
																onClick={() => goToFolder(folder.path)}
																type="button"
															>
																<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
																	<FolderIcon className="size-4" />
																</span>
																<span className="min-w-0 flex-1">
																	<span className="block truncate font-mono text-11 text-foreground">
																		{folder.name}
																	</span>
																	<span className="block text-10 text-muted-foreground">
																		{folder.total} file{folder.total === 1 ? "" : "s"}
																	</span>
																</span>
																<ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
															</button>
														</li>
													))}
												</ul>
											) : null}

											{folderRows.length > 0 ? (
												<div className="mt-3">
													<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
														{folderRows.map((item) => (
															<AssetCard
																asset={item}
																key={item.path}
																onCopy={(path) => void copyPath(path)}
																onOpen={(asset) => setActive(asset)}
																showPath={false}
															/>
														))}
													</ul>
												</div>
											) : currentFolder.children.length === 0 ? (
												<div className="mt-3">
													<EmptyState
														compact
														description="Drag images onto the page to add files here."
														icon={FolderOpenIcon}
														title="This folder is empty"
													/>
												</div>
											) : null}
										</>
									)}
								</section>
							</div>
						)}
					</CardContent>
				</Card>

				{dragging ? (
					<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-background/90 p-8 backdrop-blur-sm">
						<div className="text-center">
							<UploadIcon className="mx-auto size-8 text-brand" />
							<p className="mt-3 text-title font-bold tracking-heading">Drop images to upload</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Files land in <code>assets/images</code>.
							</p>
						</div>
					</div>
				) : null}
			</div>

			{active ? (
				<AssetPreviewDialog
					asset={active}
					key={active.path}
					onClose={() => setActive(null)}
					onUpload={putAsset}
					onUploaded={() => assetsQuery.refresh()}
				/>
			) : null}
		</PageShell>
	);
}

interface FolderTreeNodeProps {
	activeDir: string;
	node: FolderNode;
	onSelect: (path: string) => void;
}

function FolderTreeNode({ activeDir, node, onSelect }: FolderTreeNodeProps) {
	const active = node.path === activeDir;
	const hasChildren = node.children.length > 0;

	return (
		<li>
			<button
				className={cn(
					"flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors",
					active
						? "bg-secondary text-foreground"
						: "text-muted-foreground hover:bg-muted hover:text-foreground",
				)}
				onClick={() => onSelect(node.path)}
				type="button"
			>
				{hasChildren ? (
					<FolderOpenIcon className="size-3.5 shrink-0" />
				) : (
					<FolderIcon className="size-3.5 shrink-0" />
				)}
				<span
					className={cn("min-w-0 flex-1 truncate font-mono text-11", active && "font-semibold")}
				>
					{node.name}
				</span>
				<span className="font-mono text-10 opacity-60">{node.total}</span>
			</button>
			{hasChildren ? (
				<ul className="space-y-0.5 pl-3">
					{node.children.map((child) => (
						<FolderTreeNode
							activeDir={activeDir}
							key={child.path}
							node={child}
							onSelect={onSelect}
						/>
					))}
				</ul>
			) : null}
		</li>
	);
}
