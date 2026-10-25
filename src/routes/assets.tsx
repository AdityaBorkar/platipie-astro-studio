import { createFileRoute } from "@tanstack/react-router";
import { CopyIcon, ImageIcon, RefreshCwIcon, SearchIcon, UploadIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";

interface MediaItem {
	mtime: number;
	path: string;
	size: number;
	url: string;
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

function AssetsPage() {
	const [media, setMedia] = useState<MediaItem[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [tick, setTick] = useState(0);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		let alive = true;
		setError(null);
		fetch(`/api/cms/media?tick=${tick}`)
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to list assets");
				return json as { media: MediaItem[] };
			})
			.then((json) => {
				if (alive) setMedia(json.media ?? []);
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
		if (!needle) return media ?? [];
		return (media ?? []).filter((item) => item.path.toLowerCase().includes(needle));
	}, [media, query]);

	const totalBytes = (media ?? []).reduce((sum, item) => sum + item.size, 0);

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
			setTick((value) => value + 1);
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
						Images, <span className="text-brand">ready to reference.</span>
					</h1>
					<p className="gb-sub mt-3 max-w-xl text-base">
						Everything under <code>assets/images</code> and <code>public</code>. Uploads land in the
						Astro checkout and return a site-relative path.
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
					<Button onClick={() => setTick((value) => value + 1)} size="sm" variant="outline">
						<RefreshCwIcon className="size-3.5" />
						Reload
					</Button>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-1.5">
				<Badge variant="secondary">{media?.length ?? 0} assets</Badge>
				<Badge className="font-mono" variant="outline">
					{formatBytes(totalBytes)}
				</Badge>
				<Badge variant="brand">
					<ImageIcon className="size-3" />
					assets/images + public
				</Badge>
			</div>

			{error ? (
				<Hint title="Failed to load assets" variant="danger">
					{error}
				</Hint>
			) : null}

			<Card className="mt-6 gap-3">
				<CardHeader className="gap-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<CardTitle>Media library</CardTitle>
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
								placeholder="Filter assets…"
								value={query}
							/>
						</InputGroup>
					</div>
				</CardHeader>
				<CardContent>
					{media === null ? (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							<Skeleton className="h-48 w-full" />
							<Skeleton className="h-48 w-full" />
							<Skeleton className="h-48 w-full" />
							<Skeleton className="h-48 w-full" />
						</div>
					) : filtered.length === 0 ? (
						<Hint title="No assets match" variant="info">
							Upload an image or clear the filter to see the library.
						</Hint>
					) : (
						<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filtered.map((item) => (
								<li
									className="overflow-hidden rounded-xl border border-border bg-card"
									key={item.path}
								>
									<div className="flex h-36 items-center justify-center bg-muted">
										<img
											alt={item.path}
											className="size-full object-contain"
											loading="lazy"
											src={`/api/cms/media?path=${encodeURIComponent(item.path)}`}
										/>
									</div>
									<div className="p-3">
										<p className="truncate font-mono text-11 text-foreground" title={item.path}>
											{item.path}
										</p>
										<div className="mt-2 flex items-center justify-between gap-2">
											<span className="font-mono text-10 text-muted-foreground">
												{formatBytes(item.size)} · {new Date(item.mtime).toLocaleDateString()}
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
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Hint className="mt-4" title="Upload rules" variant="info">
				Images only, 10 MB cap, sanitized filenames. The picker writes the returned path; remote{" "}
				<code>http(s)</code> URLs are also accepted as plain strings.
			</Hint>
		</div>
	);
}
