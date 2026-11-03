import { Link } from "@tanstack/react-router";
import {
	BracesIcon,
	CopyIcon,
	FileTextIcon,
	SlidersHorizontalIcon,
	SquarePenIcon,
} from "lucide-react";

import { Hint } from "#/components/gitbook/hint";
import { EmptyState } from "#/components/gitbook/page";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { formatMtime } from "../format-mtime";
import type { LoadedEntry, RecentEntry } from "./model";
import { entryExt, entryKind, fmStr, formatValue } from "./model";

export function PropertiesRail({
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
	const status = fmStr(loaded?.frontmatter, "status");
	const metaRows: { label: string; value: string }[] = [
		{ label: "Collection", value: collectionLabel ?? entry.collection },
		{ label: "Entry", value: entry.id },
		{ label: "Kind", value: entryKind(ext) },
		{ label: "Modified", value: formatMtime(entry.mtime) },
		{ label: "Path", value: entry.path },
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
							{fields.map(([name, value]) => {
								const text = formatValue(value);
								return (
									<div
										className="grid gap-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0"
										key={name}
									>
										<dt className="font-mono text-9 tracking-12 text-muted-foreground uppercase">
											{name}
										</dt>
										<dd>
											{text.includes("\n") ? (
												<pre className="code-surface mt-1 overflow-auto p-3 font-mono text-11 whitespace-pre-wrap">
													{text}
												</pre>
											) : (
												<span className="text-13 leading-relaxed wrap-break-word">{text}</span>
											)}
										</dd>
									</div>
								);
							})}
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
