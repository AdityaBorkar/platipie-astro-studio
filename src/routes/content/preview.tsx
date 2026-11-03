import { BracesIcon, FileCode2Icon, FileTextIcon, FolderTreeIcon } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { EmptyState } from "#/components/gitbook/page";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import { markdownToSafeHtml } from "../markdown";
import type { LoadedEntry, RecentEntry } from "./model";
import { entryExt, entryKind, fmStr, formatValue, rowForIndex } from "./model";

export function PreviewStage({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex h-full min-h-80 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
			<div aria-hidden="true" className="gb-dotgrid absolute inset-0 opacity-60" />
			<div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
		</div>
	);
}

function valueClassName(compact: boolean): string {
	return compact
		? "text-11 leading-relaxed wrap-break-word"
		: "text-13 leading-relaxed wrap-break-word";
}

function MarkdownPreview({
	collectionLabel,
	entry,
	loaded,
}: {
	collectionLabel: string | null;
	entry: RecentEntry;
	loaded: LoadedEntry;
}) {
	const previewHtml = useMemo(() => markdownToSafeHtml(loaded.body ?? ""), [loaded]);
	const title = fmStr(loaded.frontmatter, "title") ?? entry.title ?? entry.id;
	const description =
		fmStr(loaded.frontmatter, "description") ?? fmStr(loaded.frontmatter, "excerpt");
	const status = fmStr(loaded.frontmatter, "status");
	const date = fmStr(loaded.frontmatter, "publishDate") ?? fmStr(loaded.frontmatter, "date");

	return (
		<PreviewStage>
			<article className="prose-preview mx-auto w-page-narrow">
				<header className="mb-5 border-b border-border pb-4">
					<h1 className="gb-display">{title}</h1>
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

function JsonPreview({
	entry,
	jsonIndex,
	loaded,
}: {
	entry: RecentEntry;
	jsonIndex: number;
	loaded: LoadedEntry;
}) {
	const jsonRow = useMemo((): Record<string, unknown> | null => {
		return rowForIndex(loaded.body, jsonIndex);
	}, [jsonIndex, loaded]);
	const title = useMemo(() => {
		for (const key of ["title", "name"]) {
			const value = fmStr(jsonRow ?? undefined, key);
			if (value) return value;
		}
		return fmStr(loaded.frontmatter, "title") ?? entry.title ?? entry.id;
	}, [entry, jsonRow, loaded]);

	return (
		<PreviewStage>
			<article className="prose-preview mx-auto w-page-narrow">
				<header className="border-b border-border pb-3">
					<h1 className="gb-display">{title}</h1>
					<p className="mt-1 font-mono text-10 text-muted-foreground">
						row {jsonIndex >= 0 ? jsonIndex + 1 : "—"} · {entry.path}
					</p>
				</header>
				{jsonRow ? (
					<dl className="mt-4 grid gap-3">
						{Object.entries(jsonRow).map(([key, value]) => {
							const text = formatValue(value);
							return (
								<div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2" key={key}>
									<dt className="font-mono text-9 tracking-12 text-muted-foreground uppercase">
										{key}
									</dt>
									<dd className="mt-1">
										{text.includes("\n") ? (
											<pre
												className={cn(
													"code-surface mt-1 overflow-auto p-2 font-mono text-10 whitespace-pre-wrap",
												)}
											>
												{text}
											</pre>
										) : (
											<span className={valueClassName(false)}>{text}</span>
										)}
									</dd>
								</div>
							);
						})}
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

function RawPreview({ entry, loaded }: { entry: RecentEntry; loaded: LoadedEntry }) {
	const ext = entryExt(entry.path);
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

export function EntryPreviewSkeleton() {
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

export function EntryPreview({
	collectionLabel,
	entry,
	jsonIndex,
	loaded,
}: {
	collectionLabel: string | null;
	entry: RecentEntry;
	jsonIndex: number;
	loaded: LoadedEntry;
}) {
	const ext = entryExt(entry.path);

	if (ext === ".md" || ext === ".mdx") {
		return <MarkdownPreview collectionLabel={collectionLabel} entry={entry} loaded={loaded} />;
	}

	if (ext === ".json") {
		return <JsonPreview entry={entry} jsonIndex={jsonIndex} loaded={loaded} />;
	}

	return <RawPreview entry={entry} loaded={loaded} />;
}

export function NothingSelected() {
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

export function NoPreview() {
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
