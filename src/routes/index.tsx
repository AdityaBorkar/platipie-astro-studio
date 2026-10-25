import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	ClockIcon,
	FileTextIcon,
	FolderIcon,
	LayoutGridIcon,
	ListIcon,
	PlusIcon,
	RefreshCwIcon,
	SearchIcon,
	SparklesIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";

interface DashboardData {
	collections: { count: number; id: string; label: string; source: string }[];
	counts: Record<string, number>;
	drift: { code: string; hint?: string; message: string }[];
	env: {
		aiEnabled: boolean;
		astroRoot: string;
		astroRootReachable: boolean;
		astroUrl: string | null;
		port: number;
		trashTtlDays: number;
	};
	recent: { collection: string; id: string; mtime: number; path: string; title?: string }[];
}

export const Route = createFileRoute("/")({
	component: Dashboard,
	head: () => ({ meta: [{ title: "Dashboard · platipie-cms" }] }),
});

function Dashboard() {
	const [data, setData] = useState<DashboardData | null>(null);
	const [q, setQ] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [showAllDrift, setShowAllDrift] = useState(false);

	useEffect(() => {
		fetch("/api/cms/collections")
			.then((response) => response.json())
			.then(setData)
			.catch((e: unknown) => setError(String(e)));
	}, []);

	if (error) {
		return (
			<div className="mx-auto w-page px-5 py-10">
				<Hint title="Failed to load the workspace" variant="danger">
					{error}
				</Hint>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="mx-auto w-page px-5 py-10">
				<Skeleton className="h-10 w-64" />
				<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
				</div>
				<Skeleton className="mt-6 h-72 w-full" />
			</div>
		);
	}

	const totalEntries = data.collections.reduce((sum, collection) => sum + collection.count, 0);
	const reachable = data.env.astroRootReachable;

	return (
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise flex flex-wrap items-end justify-between gap-5">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Workspace</p>
					<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">
						Content, kept <span className="text-brand">accurate.</span>
					</h1>
					<p className="gb-sub mt-3 max-w-xl text-base">
						Every collection, every edit, and every drift signal in one place. Files stay the source
						of truth.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button nativeButton={false} render={<Link to="/design" />} size="sm" variant="outline">
						<LayoutGridIcon className="size-3.5" />
						Design system
					</Button>
					<Button nativeButton={false} render={<Link to="/settings" />} size="sm">
						Open settings
						<ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover/button:translate-x-0.5" />
					</Button>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-1.5">
				<Badge className="font-mono" variant={reachable ? "success" : "destructive"}>
					<span
						aria-hidden="true"
						className={cn(
							"size-1.5 rounded-full",
							reachable ? "bg-brand-mint-foreground" : "bg-destructive",
						)}
					/>
					ASTRO_ROOT {reachable ? "reachable" : "missing"}
				</Badge>
				<Badge className="font-mono" variant="outline">
					{data.env.astroRoot}
				</Badge>
				<Badge className="font-mono" variant="outline">
					ASTRO_URL {data.env.astroUrl ?? "unset"}
				</Badge>
				<Badge variant={data.env.aiEnabled ? "brand" : "secondary"}>
					<SparklesIcon className="size-3" />
					AI {data.env.aiEnabled ? "on · BYOK" : "off · heuristics"}
				</Badge>
			</div>

			<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={LayoutGridIcon}
					label="Collections"
					meta={`${data.env.port} · trash ${data.env.trashTtlDays}d`}
					value={String(data.collections.length)}
				/>
				<StatCard
					icon={FileTextIcon}
					label="Entries"
					meta="across every collection"
					value={String(totalEntries)}
				/>
				<StatCard
					icon={SparklesIcon}
					label="Drift signals"
					meta={data.drift.length === 0 ? "nothing queued" : "queued for review"}
					tone={data.drift.length > 0 ? "brand" : "muted"}
					value={String(data.drift.length)}
				/>
				<StatCard
					icon={ClockIcon}
					label="Recent edits"
					meta={data.recent[0] ? new Date(data.recent[0].mtime).toLocaleDateString() : "none yet"}
					value={String(data.recent.length)}
				/>
			</div>

			<div className="mt-8 grid gap-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h2 className="text-title font-bold tracking-heading">Content health</h2>
						<p className="mt-0.5 text-sm text-muted-foreground">
							Signals from the Astro repo, surfaced before they spread.
						</p>
					</div>
					<Badge variant={data.drift.length === 0 ? "success" : "brand"}>
						{data.drift.length === 0 ? "All clear" : `${data.drift.length} open`}
					</Badge>
				</div>
				{data.drift.length === 0 ? (
					<Hint title="No drift detected" variant="success">
						The repo matches its schemas. Nothing is waiting on review.
					</Hint>
				) : (
					<div className="grid gap-2">
						{(showAllDrift ? data.drift : data.drift.slice(0, 3)).map((signal) => (
							<div
								className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
								key={signal.code}
							>
								<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
									<TriangleAlertIcon className="size-4" />
								</span>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="font-mono text-xs font-semibold text-foreground">{signal.code}</p>
										{signal.hint ? (
											<span className="text-xs text-muted-foreground">{signal.hint}</span>
										) : null}
									</div>
									<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
										{signal.message}
									</p>
								</div>
							</div>
						))}
						{data.drift.length > 3 ? (
							<Button
								className="w-fit"
								onClick={() => setShowAllDrift((value) => !value)}
								size="sm"
								variant="ghost"
							>
								{showAllDrift ? "Show fewer signals" : `Show all ${data.drift.length} signals`}
								<ArrowRightIcon className="size-3.5" />
							</Button>
						) : null}
					</div>
				)}
			</div>

			<div className="mt-10" id="collections">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<p className="text-11 font-bold tracking-14 text-brand uppercase">Collections</p>
						<h2 className="mt-2 text-title font-bold tracking-heading">Browse and create</h2>
					</div>
					<InputGroup className="w-full max-w-xs">
						<InputGroupAddon>
							<SearchIcon />
						</InputGroupAddon>
						<InputGroupInput
							aria-label="Search entries"
							onChange={(event) => setQ(event.target.value)}
							placeholder="Filter entries…"
							value={q}
						/>
					</InputGroup>
				</div>

				<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{data.collections.map((collection) => (
						<article
							className="flex flex-col rounded-xl border border-border bg-card p-5 transition-card hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-soft"
							key={collection.id}
						>
							<div className="flex items-start gap-3">
								<span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
									<FolderIcon className="size-4" />
								</span>
								<div className="min-w-0 flex-1">
									<h3 className="truncate text-sm font-bold tracking-tight">{collection.label}</h3>
									<p className="truncate font-mono text-11 text-muted-foreground">
										{collection.source}
									</p>
								</div>
								<Badge variant="outline">{collection.count}</Badge>
							</div>
							<div className="mt-4">
								<CollectionEntries collection={collection.id} query={q} />
							</div>
						</article>
					))}
				</div>
			</div>

			<div className="mt-10" id="recent">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<p className="text-11 font-bold tracking-14 text-brand uppercase">Activity</p>
						<h2 className="mt-2 text-title font-bold tracking-heading">Recent edits</h2>
					</div>
					<p className="text-sm text-muted-foreground">
						{data.recent.length} most recently modified entries
					</p>
				</div>
				<div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
					{data.recent.length === 0 ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<FileTextIcon />
								</EmptyMedia>
								<EmptyTitle>No recent edits</EmptyTitle>
								<EmptyDescription>Edit an entry and it will show up here.</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/40 hover:bg-muted/40">
									<TableHead className="pl-5">Entry</TableHead>
									<TableHead>Collection</TableHead>
									<TableHead>Modified</TableHead>
									<TableHead className="w-24 pr-5 text-right">Open</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.recent.map((entry) => (
									<TableRow key={entry.path}>
										<TableCell className="pl-5">
											<span className="flex items-center gap-2 font-medium">
												<FileTextIcon className="size-3.5 text-muted-foreground" />
												{entry.id}
											</span>
											<span className="mt-0.5 block truncate font-mono text-11 text-muted-foreground">
												{entry.path}
											</span>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">{entry.collection}</Badge>
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{new Date(entry.mtime).toLocaleString()}
										</TableCell>
										<TableCell className="pr-5 text-right">
											<Button
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
												variant="outline"
											>
												Open
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</div>
		</div>
	);
}

function StatCard({
	icon: Icon,
	label,
	meta,
	tone = "muted",
	value,
}: {
	icon: typeof ClockIcon;
	label: string;
	meta: string;
	tone?: "brand" | "muted";
	value: string;
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<div className="flex items-center justify-between">
				<p className="text-11 font-bold tracking-12 text-muted-foreground uppercase">{label}</p>
				<span
					className={cn(
						"inline-flex size-7 items-center justify-center rounded-md",
						tone === "brand" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground",
					)}
				>
					<Icon className="size-3.5" />
				</span>
			</div>
			<p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
			<p className="mt-1 truncate text-xs text-muted-foreground">{meta}</p>
		</div>
	);
}

function CollectionEntries({ collection, query }: { collection: string; query: string }) {
	const [entries, setEntries] = useState<{ id: string; path: string; title?: string }[] | null>(
		null,
	);
	const [show, setShow] = useState(false);
	const [newSlug, setNewSlug] = useState("");

	async function load() {
		const response = await fetch(
			`/api/cms/entries?collection=${collection}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
		);
		const json = await response.json();
		setEntries(json.entries ?? []);
	}

	const filtered = (entries ?? []).filter(
		(entry) => !query || entry.id.toLowerCase().includes(query.toLowerCase()),
	);
	const canCreate = collection === "projects" || collection === "blog";

	return (
		<div className="grid gap-2.5">
			<div className="flex flex-wrap items-center gap-1.5">
				<Button
					onClick={() => {
						setShow(!show);
						if (!show) void load();
					}}
					size="sm"
					variant="outline"
				>
					<ListIcon className="size-3.5" />
					{show ? "Hide entries" : "Browse entries"}
				</Button>
				<Button onClick={() => void load()} size="icon-sm" variant="ghost">
					<RefreshCwIcon className="size-3.5" />
					<span className="sr-only">Refresh</span>
				</Button>
			</div>

			{canCreate ? (
				<div className="flex items-center gap-1.5">
					<Input
						aria-label="New entry slug"
						className="h-8 font-mono text-xs"
						onChange={(event) => setNewSlug(event.target.value)}
						placeholder="new-slug"
						value={newSlug}
					/>
					<Button
						onClick={() => {
							if (!newSlug) return;
							fetch("/api/cms/entries", {
								body: JSON.stringify({
									collection,
									fromTemplate: collection === "projects",
									slug: newSlug,
								}),
								headers: { "Content-Type": "application/json" },
								method: "POST",
							})
								.then(async (response) => ({ body: await response.json(), ok: response.ok }))
								.then(({ body, ok }) => {
									if (ok) {
										setNewSlug("");
										void load();
										toast.success(`Created ${newSlug}`);
									} else {
										toast.error(JSON.stringify(body));
									}
								})
								.catch((e: unknown) => toast.error(String(e)));
						}}
						size="sm"
					>
						<PlusIcon className="size-3.5" />
						New
					</Button>
				</div>
			) : null}

			{show &&
				(entries === null ? (
					<div className="grid gap-1.5">
						<Skeleton className="h-7 w-full" />
						<Skeleton className="h-7 w-full" />
					</div>
				) : filtered.length === 0 ? (
					<Empty className="py-4">
						<EmptyHeader>
							<EmptyTitle>No entries</EmptyTitle>
							<EmptyDescription>
								{query ? `Nothing matches “${query}”.` : "This collection is empty."}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<ul className="max-h-52 overflow-y-auto pr-1">
						{filtered.map((entry) => (
							<li key={entry.path}>
								<Link
									className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									params={{ collection, id: encodeURIComponent(entry.id) }}
									search={{ path: entry.path }}
									to="/edit/$collection/$id"
								>
									<FileTextIcon className="size-3.5 shrink-0" />
									<span className="truncate font-mono text-xs">{entry.id}</span>
									<ArrowRightIcon className="ml-auto size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
								</Link>
							</li>
						))}
					</ul>
				))}
		</div>
	);
}
