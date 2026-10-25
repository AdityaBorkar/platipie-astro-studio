import { createFileRoute } from "@tanstack/react-router";
import {
	CopyIcon,
	FileIcon,
	FilmIcon,
	ImageIcon,
	RefreshCwIcon,
	SearchIcon,
	TypeIcon,
	UploadIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";

interface AssetRow {
	dir: string;
	ext: string;
	kind: string;
	mtime: number;
	name: string;
	path: string;
	size: number;
}

interface InventoryResponse {
	rows: AssetRow[];
	status: { fileCount: number; lastSync: number | null; scope: string }[];
}

export const Route = createFileRoute("/assets")({
	component: AssetsPage,
	head: () => ({ meta: [{ title: "Assets · platipie-cms" }] }),
});

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function copyPath(path: string) {
	try {
		await navigator.clipboard.writeText(path);
		toast.success(`Copied ${path}`);
	} catch {
		toast.error("Clipboard unavailable");
	}
}

function kindIcon(kind: string) {
	switch (kind) {
		case "image":
		case "svg":
			return ImageIcon;
		case "video":
			return FilmIcon;
		case "font":
			return TypeIcon;
		default:
			return FileIcon;
	}
}

function isPreviewable(row: AssetRow): boolean {
	return row.kind === "image" || row.kind === "svg";
}

function AssetsPage() {
	const [assets, setAssets] = useState<AssetRow[] | null>(null);
	const [lastSync, setLastSync] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [tick, setTick] = useState(0);
	const [syncing, setSyncing] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		let alive = true;
		setError(null);
		fetch(`/api/cms/inventory?scope=assets&tick=${tick}`)
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load assets");
				return json as InventoryResponse;
			})
			.then((json) => {
				if (alive) {
					setAssets(json.rows ?? []);
					setLastSync(json.status.find((entry) => entry.scope === "assets")?.lastSync ?? null);
				}
			})
			.catch((e: unknown) => {
				if (alive) setError(String((e as Error).message ?? e));
			});
		return () => {
			alive = false;
		};
	}, [tick]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return assets ?? [];
		return (assets ?? []).filter(
			(item) =>
				item.path.toLowerCase().includes(needle) || item.kind.toLowerCase().includes(needle),
		);
	}, [assets, query]);

	const kindCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const item of assets ?? []) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
		return [...counts.entries()].toSorted((a, b) => b[1] - a[1]);
	}, [assets]);

	const totalBytes = (assets ?? []).reduce((sum, item) => sum + item.size, 0);

	async function resync() {
		setSyncing(true);
		try {
			const response = await fetch("/api/cms/sync", {
				body: JSON.stringify({ scope: "assets" }),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Re-sync failed");
			toast.success(`Re-synced ${json.fileCount} assets`);
			setTick((value) => value + 1);
		} catch (e: unknown) {
			toast.error(String((e as Error).message ?? e));
		} finally {
			setSyncing(false);
		}
	}

	async function upload(file: File) {
		setUploading(true);
		try {
			const form = new FormData();
			form.set("file", file);
			form.set("dest", "assets");
			const response = await fetch("/api/cms/media", { body: form, method: "POST" });
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Upload failed");
			toast.success(`Uploaded → ${json.path}`);
			await resync();
		} catch (e: unknown) {
			toast.error(String((e as Error).message ?? e));
		} finally {
			setUploading(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	return (
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise flex flex-wrap items-end justify-between gap-5">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Assets</p>
					<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">
						The <span className="text-brand">assets directory,</span> in view.
					</h1>
					<p className="gb-sub mt-3 max-w-xl text-base">
						Every file under <code>assets/</code> in the Astro checkout, mirrored into the SQLite
						read-model by the FS watcher. Uploads land in <code>assets/images</code> and return a
						site-relative path.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<input
						accept="image/*"
						className="sr-only"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) void upload(file);
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
					<Button disabled={syncing} onClick={() => void resync()} size="sm" variant="outline">
						<RefreshCwIcon className="size-3.5" />
						{syncing ? "Syncing…" : "Re-sync"}
					</Button>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-1.5">
				<Badge variant="secondary">{assets?.length ?? 0} files</Badge>
				<Badge className="font-mono" variant="outline">
					{formatBytes(totalBytes)}
				</Badge>
				<Badge className="font-mono" variant={lastSync ? "success" : "destructive"}>
					{lastSync ? `synced ${new Date(lastSync).toLocaleString()}` : "never synced"}
				</Badge>
				{kindCounts.map(([kind, count]) => (
					<Badge key={kind} variant="outline">
						{kind} · {count}
					</Badge>
				))}
			</div>

			{error ? (
				<Hint title="Failed to load assets" variant="danger">
					{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
				</Hint>
			) : null}

			<Card className="mt-6 gap-3">
				<CardHeader className="gap-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<CardTitle>Assets Viewer</CardTitle>
							<CardDescription>
								Copy a path into <code>featuredImage</code>, <code>ogImage</code>, or{" "}
								<code>hero_image</code>.
							</CardDescription>
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
					) : filtered.length === 0 ? (
						<Hint title="No assets match" variant="info">
							Upload a file or clear the filter to see the directory.
						</Hint>
					) : (
						<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filtered.map((item) => {
								const Icon = kindIcon(item.kind);
								return (
									<li
										className="overflow-hidden rounded-xl border border-border bg-card"
										key={item.path}
									>
										<div className="flex h-36 items-center justify-center bg-muted">
											{isPreviewable(item) ? (
												<img
													alt={item.path}
													className="size-full object-contain"
													loading="lazy"
													src={`/api/cms/media?path=${encodeURIComponent(item.path)}`}
												/>
											) : (
												<span className="flex flex-col items-center gap-1 text-muted-foreground">
													<Icon className="size-8" />
													<span className="font-mono text-10">.{item.ext.replace(".", "")}</span>
												</span>
											)}
										</div>
										<div className="p-3">
											<p className="truncate font-mono text-11 text-foreground" title={item.path}>
												{item.path}
											</p>
											<div className="mt-2 flex items-center justify-between gap-2">
												<span className="font-mono text-10 text-muted-foreground">
													{item.kind} · {formatBytes(item.size)} ·{" "}
													{new Date(item.mtime).toLocaleDateString()}
												</span>
												<Button
													aria-label={`Copy ${item.path}`}
													onClick={() => void copyPath(item.path)}
													size="icon-xs"
													variant="ghost"
												>
													<CopyIcon className="size-3.5" />
												</Button>
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>

			<Hint className="mt-4" title="Sync source" variant="info">
				Rows come from the <code>assets</code> SQLite table, kept fresh by <code>bun run sync</code>
				. Uploads still write straight to the Astro checkout.
			</Hint>
		</div>
	);
}
