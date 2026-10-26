import { createFileRoute, useRouterState } from "@tanstack/react-router";
import {
	ComponentIcon,
	FileCode2Icon,
	FolderIcon,
	LayoutTemplateIcon,
	RotateCcwIcon,
	SearchIcon,
	SlidersHorizontalIcon,
	SquareDashedIcon,
	XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FileTypeIcon } from "#/components/file-type-icon";
import { Hint } from "#/components/gitbook/hint";
import { EmptyState } from "#/components/gitbook/page";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { fetchJson, useCachedFetch } from "#/hooks/use-cached-fetch";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/components")({
	component: ComponentsPage,
	head: () => ({ meta: [{ title: "Components · platipie-cms" }] }),
});

type ParamKind = "boolean" | "number" | "select" | "text";
type ParamValue = boolean | number | string;
type WorkbenchTab = "components" | "layouts" | "templates";

interface ParamField {
	defaultValue: ParamValue;
	kind: ParamKind;
	name: string;
	options?: string[];
}

interface SyncedFile {
	dir: string;
	ext: string;
	hasSlot?: number;
	mtime: number;
	name: string;
	path: string;
	props?: string;
	size: number;
	subject?: string | null;
}

interface SyncedInventory {
	rows: Record<string, SyncedFile[]>;
	status: { fileCount: number; lastSync: number | null; scope: string }[];
}

interface FileGroup {
	dir: string;
	files: SyncedFile[];
}

const INVENTORY_KEY = "/api/cms/inventory?scope=components,layouts,templates";

const TABS: { icon: LucideIcon; label: string; tab: WorkbenchTab }[] = [
	{ icon: ComponentIcon, label: "Components", tab: "components" },
	{ icon: LayoutTemplateIcon, label: "Layouts", tab: "layouts" },
	{ icon: FileCode2Icon, label: "Templates", tab: "templates" },
];

const EMPTY_COPY: Record<WorkbenchTab, { description: string; title: string }> = {
	components: {
		description: "Add a component under src/components in the Astro checkout, then re-sync.",
		title: "No components found",
	},
	layouts: {
		description: "Page shells live under src/layouts. Add one and the watcher will pick it up.",
		title: "No layouts found",
	},
	templates: {
		description:
			"src/templates is optional and currently empty. Scaffolds added there appear after a re-sync.",
		title: "No templates yet",
	},
};

const PARAM_OPTIONS: Record<string, string[]> = {
	align: ["start", "center", "end"],
	as: ["div", "span", "button", "a"],
	direction: ["row", "column"],
	justify: ["start", "center", "end", "between"],
	orientation: ["horizontal", "vertical"],
	position: ["top", "right", "bottom", "left"],
	size: ["xs", "sm", "default", "lg", "xl", "icon"],
	target: ["_self", "_blank"],
	theme: ["light", "dark", "system"],
	type: ["button", "submit", "reset"],
	variant: ["default", "secondary", "outline", "ghost", "destructive", "brand", "link"],
};

const TEXT_DEFAULTS: Record<string, string> = {
	alt: "Preview image",
	description: "A short description",
	heading: "A short heading",
	href: "#",
	label: "Label",
	name: "sample",
	placeholder: "Placeholder",
	text: "Text",
	title: "A short title",
};

const BOOLEAN_PARAMS = new Set([
	"active",
	"allow",
	"autoplay",
	"can",
	"checked",
	"closable",
	"compact",
	"disabled",
	"dismissible",
	"expandable",
	"external",
	"fluid",
	"full",
	"has",
	"hidden",
	"hide",
	"horizontal",
	"hover",
	"invalid",
	"inverse",
	"is",
	"loading",
	"loop",
	"muted",
	"no",
	"open",
	"outlined",
	"pause",
	"readonly",
	"required",
	"reverse",
	"rounded",
	"should",
	"show",
	"vertical",
	"without",
]);

const NUMBER_PARAMS = new Set([
	"cols",
	"columns",
	"count",
	"delay",
	"depth",
	"gap",
	"height",
	"index",
	"length",
	"level",
	"limit",
	"max",
	"min",
	"offset",
	"opacity",
	"page",
	"ratio",
	"repeat",
	"rows",
	"size",
	"spacing",
	"speed",
	"step",
	"total",
	"width",
]);

function isWorkbenchTab(value: string): value is WorkbenchTab {
	return value === "components" || value === "layouts" || value === "templates";
}

function parseProps(raw?: string): string[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const names = parsed.filter((entry): entry is string => typeof entry === "string");
		return [...new Set(names)];
	} catch {
		return [];
	}
}

function nameTokens(name: string): string[] {
	return name
		.replaceAll(/([a-z\d])([A-Z])/gu, "$1 $2")
		.toLowerCase()
		.split(/[^a-z\d]+/u)
		.filter(Boolean);
}

function paramKind(name: string): ParamKind {
	const key = name.toLowerCase();
	if (PARAM_OPTIONS[key]) return "select";
	const tokens = nameTokens(name);
	if (BOOLEAN_PARAMS.has(key) || tokens.some((token) => BOOLEAN_PARAMS.has(token))) {
		return "boolean";
	}
	if (NUMBER_PARAMS.has(key) || tokens.some((token) => NUMBER_PARAMS.has(token))) {
		return "number";
	}
	return "text";
}

function paramDefault(name: string, kind: ParamKind): ParamValue {
	if (kind === "boolean") return false;
	if (kind === "number") return 0;
	if (kind === "select") return PARAM_OPTIONS[name.toLowerCase()]?.[0] ?? "";
	return TEXT_DEFAULTS[name.toLowerCase()] ?? "";
}

function buildFields(props: string[]): ParamField[] {
	return props.map((name) => {
		const kind = paramKind(name);
		return {
			defaultValue: paramDefault(name, kind),
			kind,
			name,
			options: kind === "select" ? PARAM_OPTIONS[name.toLowerCase()] : undefined,
		};
	});
}

function groupFiles(files: SyncedFile[]): FileGroup[] {
	const groups = new Map<string, SyncedFile[]>();
	for (const file of files) {
		const dir = file.dir || "src";
		const existing = groups.get(dir);
		if (existing) existing.push(file);
		else groups.set(dir, [file]);
	}
	return [...groups.entries()]
		.map(([dir, entries]) => ({ dir, files: entries }))
		.toSorted((a, b) => a.dir.localeCompare(b.dir));
}

function ParamControl({
	field,
	onChange,
	value,
}: {
	field: ParamField;
	onChange: (value: ParamValue) => void;
	value: ParamValue;
}) {
	const id = `param-${field.name}`;

	if (field.kind === "boolean") {
		const checked = Boolean(value);
		return (
			<div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2">
				<span className="font-mono text-11 text-muted-foreground">{String(checked)}</span>
				<Switch checked={checked} id={id} onCheckedChange={(next) => onChange(next)} />
			</div>
		);
	}

	if (field.kind === "number") {
		return (
			<Input
				id={id}
				onChange={(event) => {
					const next = event.target.valueAsNumber;
					onChange(Number.isNaN(next) ? 0 : next);
				}}
				type="number"
				value={typeof value === "number" ? value : 0}
			/>
		);
	}

	if (field.kind === "select") {
		return (
			<Select onValueChange={(next) => onChange(next ?? "")} value={String(value)}>
				<SelectTrigger className="w-full" id={id} size="sm">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{field.options?.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	return (
		<Input
			id={id}
			onChange={(event) => onChange(event.target.value)}
			value={typeof value === "string" ? value : String(value)}
		/>
	);
}

function PreviewCanvas({ fields, file }: { fields: ParamField[]; file: SyncedFile | null }) {
	if (!file) {
		return (
			<div className="grid h-full min-h-80 place-items-center p-4">
				<EmptyState
					description="Pick a component, layout, or template from the left to stage it here."
					icon={SquareDashedIcon}
					title="Nothing staged"
				/>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-80 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft">
			<div className="relative grid flex-1 place-items-center p-6">
				<div aria-hidden="true" className="gb-dotgrid absolute inset-0 opacity-60" />
				<div className="relative z-10 max-w-sm text-center">
					<span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl border border-border/70 bg-card text-brand shadow-soft">
						<SquareDashedIcon className="size-5" />
					</span>
					<p className="mt-4 text-title font-bold tracking-heading">Preview mounts here</p>
					<p className="gb-sub mt-1.5 text-sm">
						The renderer is the next step. Selecting a file and editing parameters already updates
						the workbench state.
					</p>
					<div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
						<Badge variant="secondary">{fields.length} params</Badge>
						{file.hasSlot ? <Badge variant="brand">slot</Badge> : null}
						<Badge className="font-mono" variant="outline">
							{file.ext}
						</Badge>
					</div>
				</div>
			</div>
		</div>
	);
}

function FileList({
	files,
	onSelect,
	selectedPath,
}: {
	files: SyncedFile[];
	onSelect: (path: string) => void;
	selectedPath: string | null;
}) {
	if (files.length === 0) {
		return (
			<EmptyState
				className="m-2"
				compact
				description="Nothing matches this filter."
				icon={FileCode2Icon}
				title="No files"
			/>
		);
	}

	return (
		<div className="grid gap-3">
			{groupFiles(files).map((group) => (
				<div key={group.dir}>
					<div className="flex items-center gap-1.5 px-2 pb-1">
						<FolderIcon className="size-3 shrink-0 text-muted-foreground" />
						<p className="truncate font-mono text-9 text-muted-foreground">{group.dir}</p>
					</div>
					<ul className="grid gap-0.5">
						{group.files.map((file) => {
							const selected = file.path === selectedPath;
							return (
								<li key={file.path}>
									<button
										aria-pressed={selected}
										className={cn(
											"flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
											selected ? "bg-card ring-1 ring-border" : "hover:bg-muted/70",
										)}
										onClick={() => onSelect(file.path)}
										type="button"
									>
										<FileTypeIcon
											className={selected ? "text-brand" : "text-muted-foreground"}
											ext={file.ext}
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-13 font-semibold">{file.name}</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
}

function ParameterRail({
	dirty,
	fields,
	file,
	onReset,
	onUpdate,
	values,
}: {
	dirty: boolean;
	fields: ParamField[];
	file: SyncedFile | null;
	onReset: () => void;
	onUpdate: (name: string, value: ParamValue) => void;
	values: Record<string, ParamValue>;
}) {
	if (!file) {
		return (
			<div className="p-4">
				<EmptyState
					compact
					description="Select a file to inspect the props declared in its interface."
					icon={SlidersHorizontalIcon}
					title="No parameters yet"
				/>
			</div>
		);
	}

	return (
		<>
			<header className="border-b border-border/70 p-4">
				<div className="flex items-center gap-2">
					<SlidersHorizontalIcon className="size-4 text-brand" />
					<h2 className="text-sm font-bold tracking-heading">Parameters</h2>
					<Badge className="ml-auto font-mono" variant="outline">
						{fields.length}
					</Badge>
				</div>
				<p className="mt-1.5 text-11 leading-relaxed text-muted-foreground">
					Edits update the workbench state immediately. The renderer will consume these values.
				</p>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				{fields.length === 0 ? (
					<EmptyState
						compact
						description="This file has no interface Props fields, so there is nothing to tune yet."
						icon={SlidersHorizontalIcon}
						title="No props detected"
					/>
				) : (
					<FieldGroup className="gap-4">
						{fields.map((field) => (
							<Field key={field.name}>
								<div className="flex items-center justify-between gap-2">
									<FieldLabel className="font-mono text-11" htmlFor={`param-${field.name}`}>
										{field.name}
									</FieldLabel>
									<span className="font-mono text-9 tracking-12 text-muted-foreground uppercase">
										{field.kind}
									</span>
								</div>
								<ParamControl
									field={field}
									onChange={(value) => onUpdate(field.name, value)}
									value={values[field.name] ?? field.defaultValue}
								/>
							</Field>
						))}
					</FieldGroup>
				)}
			</div>

			<footer className="flex items-center gap-2 border-t border-border/70 px-4 py-3">
				<Button className="flex-1" disabled={!dirty} onClick={onReset} size="sm" variant="outline">
					<RotateCcwIcon />
					Reset
				</Button>
			</footer>
		</>
	);
}

function ComponentsPage() {
	const [tab, setTab] = useState<WorkbenchTab>("components");
	const [query, setQuery] = useState("");
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [valuesByPath, setValuesByPath] = useState<Record<string, Record<string, ParamValue>>>({});

	const fetchInventory = useCallback(() => fetchJson<SyncedInventory>(INVENTORY_KEY), []);
	const inventoryQuery = useCachedFetch(INVENTORY_KEY, fetchInventory, {
		errorMessage: "Could not refresh the component inventory",
	});
	const inventory = inventoryQuery.data;
	const error = inventory === null ? inventoryQuery.error : null;
	const routerHref = useRouterState({ select: (state) => state.location.href });

	useEffect(() => {
		const sync = () => {
			const hash = window.location.hash.slice(1);
			if (isWorkbenchTab(hash)) setTab(hash);
		};
		sync();
		window.addEventListener("hashchange", sync);
		return () => window.removeEventListener("hashchange", sync);
	}, []);

	useEffect(() => {
		const hashAt = routerHref.indexOf("#");
		const hash = hashAt >= 0 ? routerHref.slice(hashAt + 1) : "";
		if (isWorkbenchTab(hash)) setTab(hash);
	}, [routerHref]);

	const rows = inventory?.rows;
	const activeFiles = useMemo(() => rows?.[tab] ?? [], [rows, tab]);
	const filteredFiles = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return activeFiles;
		return activeFiles.filter(
			(file) =>
				file.name.toLowerCase().includes(needle) || file.path.toLowerCase().includes(needle),
		);
	}, [activeFiles, query]);

	useEffect(() => {
		if (!rows) return;
		const list = rows[tab] ?? [];
		if (selectedPath && list.some((file) => file.path === selectedPath)) return;
		const first = list.find((file) => parseProps(file.props).length > 0) ?? list[0] ?? null;
		setSelectedPath(first?.path ?? null);
	}, [rows, selectedPath, tab]);

	const selectedFile = useMemo(
		() => activeFiles.find((file) => file.path === selectedPath) ?? null,
		[activeFiles, selectedPath],
	);
	const fields = useMemo(() => buildFields(parseProps(selectedFile?.props)), [selectedFile]);
	const defaults = useMemo(
		() =>
			Object.fromEntries(fields.map((field) => [field.name, field.defaultValue])) as Record<
				string,
				ParamValue
			>,
		[fields],
	);
	const values = (selectedFile ? valuesByPath[selectedFile.path] : undefined) ?? defaults;
	const dirty = fields.some((field) => values[field.name] !== field.defaultValue);
	const activeTab = TABS.find((item) => item.tab === tab) ?? TABS[0];

	function changeTab(next: WorkbenchTab) {
		if (next === tab) return;
		setTab(next);
		setSelectedPath(null);
		setQuery("");
		if (window.location.hash !== `#${next}`) window.location.hash = next;
	}

	function updateParam(name: string, value: ParamValue) {
		if (!selectedFile) return;
		setValuesByPath((current) => ({
			...current,
			[selectedFile.path]: { ...(current[selectedFile.path] ?? defaults), [name]: value },
		}));
	}

	function resetParams() {
		if (!selectedFile) return;
		setValuesByPath((current) => {
			if (!(selectedFile.path in current)) return current;
			const next = { ...current };
			delete next[selectedFile.path];
			return next;
		});
	}

	const ActiveIcon = activeTab.icon;
	const emptyCopy = EMPTY_COPY[tab];

	return (
		<div className="min-h-dvh lg:grid lg:grid-cols-docs-shell xl:h-dvh xl:grid-cols-workbench xl:overflow-hidden">
			<aside className="flex flex-col border-b border-border/70 bg-sidebar/40 lg:sticky lg:top-0 lg:row-span-2 lg:h-dvh lg:self-start lg:border-r lg:border-b-0 xl:static xl:row-span-1">
				<div className="border-b border-border/70 p-4">
					<Tabs
						className="gap-0"
						onValueChange={(value) => changeTab(value as WorkbenchTab)}
						value={tab}
					>
						<TabsList className="grid w-full grid-cols-3">
							{TABS.map((item) => (
								<TabsTrigger className="px-1 text-10" key={item.tab} value={item.tab}>
									{item.label}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</div>

				<div className="border-b border-border/70 px-3 py-2">
					<div className="relative">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							aria-label={`Search ${activeTab.label.toLowerCase()}`}
							className="h-8 px-8 text-13"
							onChange={(event) => setQuery(event.target.value)}
							placeholder={`Filter ${activeTab.label.toLowerCase()}…`}
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
					<div className="flex items-center justify-between gap-2 px-2 pb-2">
						<div className="flex min-w-0 items-center gap-1.5">
							<ActiveIcon className="size-3.5 shrink-0 text-brand" />
							<span className="truncate text-11 font-bold tracking-12 text-muted-foreground uppercase">
								{activeTab.label}
							</span>
						</div>
						<Badge className="font-mono" variant="secondary">
							{activeFiles.length}
						</Badge>
					</div>

					{error ? (
						<Hint className="m-2" title="Inventory unavailable" variant="danger">
							{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
						</Hint>
					) : null}

					{inventory === null && !error ? (
						<div className="grid gap-2 p-2">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : null}

					{inventory !== null && filteredFiles.length > 0 ? (
						<FileList
							files={filteredFiles}
							onSelect={setSelectedPath}
							selectedPath={selectedPath}
						/>
					) : null}

					{inventory !== null && filteredFiles.length === 0 ? (
						<EmptyState
							className="m-2"
							compact
							description={query ? "Try a different search." : emptyCopy.description}
							icon={query ? SearchIcon : ActiveIcon}
							title={query ? "No matches" : emptyCopy.title}
						/>
					) : null}
				</div>
			</aside>

			<section className="flex min-h-96 flex-col border-b border-border/70 lg:border-b-0 xl:min-h-0">
				<header className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
					<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
						{selectedFile ? (
							<FileTypeIcon className="size-4" ext={selectedFile.ext} />
						) : (
							<ActiveIcon className="size-4" />
						)}
					</span>
					<span className="min-w-0 flex-1">
						<span className="flex min-w-0 items-center gap-1.5">
							<h2 className="truncate text-13 font-bold tracking-tight">
								{selectedFile?.name ?? "No selection"}
							</h2>
							<Badge variant="brand">{activeTab.label}</Badge>
						</span>
						<span className="mt-0.5 block truncate font-mono text-10 text-muted-foreground">
							{selectedFile?.path ?? "Choose an item from the list"}
						</span>
					</span>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<PreviewCanvas fields={fields} file={selectedFile} />
				</div>
			</section>

			<aside className="flex min-h-0 flex-col border-border/70 bg-sidebar/30 lg:border-t xl:h-dvh xl:border-t-0 xl:border-l">
				<ParameterRail
					dirty={dirty}
					fields={fields}
					file={selectedFile}
					onReset={resetParams}
					onUpdate={updateParam}
					values={values}
				/>
			</aside>
		</div>
	);
}
