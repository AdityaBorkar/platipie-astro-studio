import { createFileRoute, Link } from "@tanstack/react-router";
import {
	FileTextIcon,
	FolderIcon,
	ListIcon,
	PlusIcon,
	RefreshCwIcon,
	SearchIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Item, ItemContent, ItemMedia, ItemTitle } from "#/components/ui/item";
import { ScrollArea } from "#/components/ui/scroll-area";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";

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
});

function Dashboard() {
	const [data, setData] = useState<DashboardData | null>(null);
	const [q, setQ] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/cms/collections")
			.then((r) => r.json())
			.then(setData)
			.catch((e: unknown) => setError(String(e)));
	}, []);

	if (error) {
		return (
			<Alert variant="destructive">
				<TriangleAlertIcon />
				<AlertTitle>Failed to load dashboard</AlertTitle>
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}
	if (!data) {
		return (
			<div className="grid gap-3">
				<Skeleton className="h-8 w-full" />
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}

	return (
		<div className="grid gap-4">
			<Card>
				<CardContent className="flex flex-col gap-3">
					<InputGroup>
						<InputGroupAddon>
							<SearchIcon />
						</InputGroupAddon>
						<InputGroupInput
							aria-label="Search entries"
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search entries…"
							value={q}
						/>
					</InputGroup>
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge className="font-mono" variant="outline">
							ASTRO_ROOT: {data.env.astroRoot} {data.env.astroRootReachable ? "✓" : "✗"}
						</Badge>
						<Badge className="font-mono" variant="outline">
							ASTRO_URL: {data.env.astroUrl ?? "unset (local preview only)"}
						</Badge>
						<Badge variant={data.env.aiEnabled ? "default" : "secondary"}>
							AI: {data.env.aiEnabled ? "on (BYOK)" : "off (heuristics only)"}
						</Badge>
					</div>
				</CardContent>
			</Card>

			{data.drift.length > 0 && (
				<div className="grid gap-2">
					{data.drift.map((d) => (
						<Alert key={d.code}>
							<TriangleAlertIcon />
							<AlertTitle>{d.code}</AlertTitle>
							<AlertDescription>
								{d.message} {d.hint ? <span>({d.hint})</span> : null}
							</AlertDescription>
						</Alert>
					))}
				</div>
			)}

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{data.collections.map((c) => (
					<Card key={c.id}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FolderIcon className="size-4 text-muted-foreground" />
								{c.label}
							</CardTitle>
							<CardDescription className="font-mono">
								{c.source} · {c.count}
							</CardDescription>
							<CardAction>
								<Badge variant="secondary">{c.count}</Badge>
							</CardAction>
						</CardHeader>
						<CardContent>
							<CollectionEntries collection={c.id} query={q} />
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent edits</CardTitle>
					<CardDescription>{data.recent.length} most recently modified entries</CardDescription>
				</CardHeader>
				<CardContent>
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
								<TableRow>
									<TableHead>Entry</TableHead>
									<TableHead>Modified</TableHead>
									<TableHead className="w-20">Open</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.recent.map((r) => (
									<TableRow key={r.path}>
										<TableCell className="font-medium">
											{r.collection}/{r.id}
										</TableCell>
										<TableCell className="font-mono text-muted-foreground">
											{new Date(r.mtime).toLocaleString()}
										</TableCell>
										<TableCell>
											<Button
												nativeButton={false}
												render={
													<Link
														params={{
															collection: r.collection,
															id: encodeURIComponent(r.id),
														}}
														search={{ path: r.path }}
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
				</CardContent>
			</Card>
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
		const r = await fetch(
			`/api/cms/entries?collection=${collection}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
		);
		const j = await r.json();
		setEntries(j.entries ?? []);
	}

	const filtered = (entries ?? []).filter(
		(e) => !query || e.id.toLowerCase().includes(query.toLowerCase()),
	);

	return (
		<div className="grid gap-2">
			<div className="flex flex-wrap items-center gap-1.5">
				<Button
					onClick={() => {
						setShow(!show);
						if (!show) void load();
					}}
					size="sm"
					variant="outline"
				>
					<ListIcon />
					{show ? "Hide" : "List"}
				</Button>
				<Button onClick={() => void load()} size="sm" variant="ghost">
					<RefreshCwIcon />
					Refresh
				</Button>
			</div>
			{(collection === "projects" || collection === "blog") && (
				<div className="flex items-center gap-1.5">
					<Input
						aria-label="New entry slug"
						className="h-7"
						onChange={(e) => setNewSlug(e.target.value)}
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
								.then(async (r) => ({ body: await r.json(), ok: r.ok }))
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
						<PlusIcon />
						New
					</Button>
				</div>
			)}
			{show &&
				(entries === null ? (
					<div className="grid gap-1.5">
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-6 w-full" />
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
					<>
						<Separator />
						<ScrollArea className="max-h-55">
							<ul className="grid gap-0.5 py-1 pr-2">
								{filtered.map((e) => (
									<Item key={e.path} render={<li />} size="sm" variant="muted">
										<ItemMedia variant="icon">
											<FileTextIcon />
										</ItemMedia>
										<ItemContent>
											<ItemTitle>
												<Link
													params={{ collection, id: encodeURIComponent(e.id) }}
													search={{ path: e.path }}
													to="/edit/$collection/$id"
												>
													{e.id}
												</Link>
											</ItemTitle>
										</ItemContent>
									</Item>
								))}
							</ul>
						</ScrollArea>
					</>
				))}
		</div>
	);
}
