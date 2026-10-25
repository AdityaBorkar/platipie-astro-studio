import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	Code2Icon,
	DatabaseIcon,
	FileTextIcon,
	FolderIcon,
	SearchIcon,
	SparklesIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import { useUiPref } from "#/hooks/use-ui-prefs";
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
		astroRoot: string;
		astroRootReachable: boolean;
		astroUrl: string | null;
		port: number;
		trashTtlDays: number;
	};
	recent: RecentEntry[];
}

export const Route = createFileRoute("/content")({
	component: ContentPage,
	head: () => ({ meta: [{ title: "Content · platipie-cms" }] }),
});

function ContentPage() {
	const showSeo = useUiPref("showContentSeo");
	const [data, setData] = useState<CollectionsResponse | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		fetch("/api/cms/collections")
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load content");
				return json as CollectionsResponse;
			})
			.then((json) => {
				if (alive) setData(json);
			})
			.catch((e: unknown) => {
				if (alive) setError(String((e as Error).message ?? e));
			});
		return () => {
			alive = false;
		};
	}, []);

	const totalEntries = (data?.collections ?? []).reduce(
		(sum, collection) => sum + collection.count,
		0,
	);

	return (
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise flex flex-wrap items-end justify-between gap-5">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Content</p>
					<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">
						Every entry, <span className="text-brand">one inbox.</span>
					</h1>
					<p className="gb-sub mt-3 max-w-xl text-base">
						The CMS collections registered against the Astro checkout. Files stay the source of
						truth; nothing is copied into a database.
					</p>
				</div>
				<Button nativeButton={false} render={<Link to="/" />} size="sm" variant="outline">
					<ArrowRightIcon className="size-3.5" />
					Open dashboard
				</Button>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-1.5">
				<Badge
					className="font-mono"
					variant={data?.env.astroRootReachable ? "success" : "destructive"}
				>
					ASTRO_ROOT {data?.env.astroRootReachable ? "reachable" : "missing"}
				</Badge>
				<Badge variant="secondary">{totalEntries} entries</Badge>
				<Badge variant={(data?.drift.length ?? 0) > 0 ? "brand" : "success"}>
					{data?.drift.length ?? 0} drift signals
				</Badge>
				<Badge variant={showSeo ? "brand" : "outline"}>SEO rail {showSeo ? "on" : "off"}</Badge>
			</div>

			{error ? (
				<Hint title="Failed to load content" variant="danger">
					{error}
				</Hint>
			) : null}

			<div className={cn("mt-6 grid items-start gap-4", showSeo && "lg:grid-cols-app-rail")}>
				<div className="grid min-w-0 gap-4">
					{data === null ? (
						<Skeleton className="h-64 w-full" />
					) : (
						<div className="grid gap-3 sm:grid-cols-2">
							{data.collections.map((collection) => (
								<Card
									className="scroll-mt-24 transition-card hover:-translate-y-0.5 hover:shadow-soft"
									id={collection.id}
									key={collection.id}
								>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<FolderIcon className="size-4 text-brand" />
											{collection.label}
										</CardTitle>
										<CardDescription className="truncate font-mono text-11">
											{collection.source}
										</CardDescription>
									</CardHeader>
									<CardContent className="flex items-center justify-between gap-2">
										<Badge variant="outline">{collection.count} entries</Badge>
										<Button
											nativeButton={false}
											render={<Link hash="collections" to="/" />}
											size="sm"
											variant="ghost"
										>
											Browse
											<ArrowRightIcon className="size-3.5" />
										</Button>
									</CardContent>
								</Card>
							))}
						</div>
					)}

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileTextIcon className="size-4 text-brand" />
								Recent edits
							</CardTitle>
							<CardDescription>The newest files across projects, blog, and legal.</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{data === null ? (
								<div className="grid gap-2 p-4">
									<Skeleton className="h-9 w-full" />
									<Skeleton className="h-9 w-full" />
								</div>
							) : data.recent.length === 0 ? (
								<Hint className="m-4" title="No recent edits" variant="info">
									Open an entry from the dashboard to start the activity log.
								</Hint>
							) : (
								<ul className="divide-y divide-border">
									{data.recent.slice(0, 10).map((entry) => (
										<li key={`${entry.collection}:${entry.path}`}>
											<Link
												className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60"
												params={{
													collection: entry.collection,
													id: encodeURIComponent(entry.id),
												}}
												search={{ path: entry.path }}
												to="/edit/$collection/$id"
											>
												<span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
													<FileTextIcon className="size-3.5" />
												</span>
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-medium">{entry.id}</span>
													<span className="block truncate font-mono text-10 text-muted-foreground">
														{entry.path}
													</span>
												</span>
												<Badge variant="secondary">{entry.collection}</Badge>
												<span className="font-mono text-10 text-muted-foreground">
													{new Date(entry.mtime).toLocaleDateString()}
												</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>

				{showSeo ? (
					<aside className="grid content-start gap-3 lg:sticky lg:top-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<SearchIcon className="size-4 text-brand" />
									SEO
								</CardTitle>
								<CardDescription>Workspace-level signals.</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-2">
								<Badge className="w-fit font-mono" variant="outline">
									ASTRO_URL {data?.env.astroUrl ?? "unset"}
								</Badge>
								<Badge className="w-fit" variant={data?.env.aiEnabled ? "brand" : "secondary"}>
									<SparklesIcon className="size-3" />
									AI {data?.env.aiEnabled ? "on · BYOK" : "off · heuristics"}
								</Badge>
								<p className="text-xs text-muted-foreground">
									Open any entry to see title, description, keyword, and readability checks in the
									editor&apos;s right rail.
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Code2Icon className="size-4 text-brand" />
									Schema markup
								</CardTitle>
								<CardDescription>Types accepted by the editor.</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-1">
								{[
									"BlogPosting",
									"Article",
									"HowTo",
									"WebPage",
									"SoftwareApplication",
									"Review",
								].map((type) => (
									<Badge className="font-mono" key={type} variant="outline">
										{type}
									</Badge>
								))}
							</CardContent>
						</Card>

						{data && data.drift.length > 0 ? (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<TriangleAlertIcon className="size-4 text-brand" />
										Drift
									</CardTitle>
								</CardHeader>
								<CardContent className="grid gap-2">
									{data.drift.slice(0, 4).map((signal) => (
										<div key={signal.code}>
											<p className="font-mono text-10 font-semibold">{signal.code}</p>
											<p className="text-xs text-muted-foreground">{signal.message}</p>
										</div>
									))}
								</CardContent>
							</Card>
						) : null}

						<Hint title="Content rail" variant="info">
							Toggle this rail from Content → Show SEO + Schema Markup in the sidebar menu.
						</Hint>
					</aside>
				) : null}
			</div>

			<Card className="mt-6">
				<CardContent className="flex flex-wrap items-center gap-2">
					<DatabaseIcon className="size-4 text-brand" />
					<span className="text-sm text-muted-foreground">
						{data?.collections.length ?? 0} collections · {data?.env.port ?? 4000} · trash{" "}
						{data?.env.trashTtlDays ?? 30}d
					</span>
					<Button
						className="ml-auto"
						nativeButton={false}
						render={<Link to="/settings" />}
						size="sm"
						variant="outline"
					>
						Settings
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
