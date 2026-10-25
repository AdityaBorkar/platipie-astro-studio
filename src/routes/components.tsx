import { createFileRoute, Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	BlocksIcon,
	DatabaseIcon,
	FileTextIcon,
	GlobeIcon,
	LayoutDashboardIcon,
	PaletteIcon,
	RefreshCwIcon,
	Settings2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";

export const Route = createFileRoute("/components")({
	component: ComponentsPage,
	head: () => ({ meta: [{ title: "Components · platipie-cms" }] }),
});

const templates = [
	{
		description: "Workspace overview with counts, drift, and recent edits.",
		href: "/",
		icon: LayoutDashboardIcon,
		label: "Dashboard",
	},
	{
		description: "Astro routes with optional metadata and schema rail.",
		href: "/website",
		icon: GlobeIcon,
		label: "Website",
	},
	{
		description: "Collections, entries, and optional SEO rail.",
		href: "/content",
		icon: DatabaseIcon,
		label: "Content",
	},
	{
		description: "Markdown ⇄ Visual editor with frontmatter and previews.",
		href: "/edit/projects/platipie",
		icon: FileTextIcon,
		label: "Editor",
	},
	{
		description: "Typed constants, raw TypeScript, appearance, trash.",
		href: "/settings",
		icon: Settings2Icon,
		label: "Settings",
	},
	{
		description: "Tokens, brand, style, components, motion, viewports.",
		href: "/design",
		icon: PaletteIcon,
		label: "Design system",
	},
];

const primitives = [
	{ name: "alert", purpose: "Inline error and status block with a title." },
	{ name: "alert-dialog", purpose: "Danger-zone confirmation before a write." },
	{ name: "badge", purpose: "24px pill for counts, states, and drift." },
	{ name: "button", purpose: "Pill action with six variants and press feedback." },
	{ name: "card", purpose: "16px hairline surface for a single decision." },
	{ name: "checkbox", purpose: "Multi-select rows and field groups." },
	{ name: "dialog", purpose: "Focused task without leaving the page." },
	{ name: "empty", purpose: "Quiet empty state with one next step." },
	{ name: "field", purpose: "Label + control + error, stacked or inline." },
	{ name: "input-group", purpose: "Input with leading icon or trailing action." },
	{ name: "select", purpose: "Schema type, status, and collection choices." },
	{ name: "separator", purpose: "Hairline between toolbar groups." },
	{ name: "switch", purpose: "Immediate on/off preference." },
	{ name: "table", purpose: "Dense scanning for entries and trash." },
	{ name: "tabs", purpose: "Markdown ⇄ Visual and section panels." },
	{ name: "textarea", purpose: "Descriptions, promises, and raw JSON." },
];

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

const SYNCED_GROUPS = [
	{ description: "Reusable UI under src/components", scope: "components", title: "Components" },
	{ description: "Page shells under src/layouts", scope: "layouts", title: "Layouts" },
	{ description: "Scaffolds under src/templates", scope: "templates", title: "Templates" },
	{
		description: "React-email templates under src/emails, when present",
		scope: "emails",
		title: "Emails",
	},
];

function lastSyncFor(status: SyncedInventory["status"], scope: string): number | null {
	return status.find((entry) => entry.scope === scope)?.lastSync ?? null;
}

function SyncedInventorySection() {
	const [inventory, setInventory] = useState<SyncedInventory | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [syncing, setSyncing] = useState(false);

	useEffect(() => {
		let alive = true;
		fetch("/api/cms/inventory?scope=components,layouts,templates,emails")
			.then(async (response) => {
				const json = await response.json();
				if (!response.ok) throw new Error(json.message ?? "Failed to load inventory");
				return json as SyncedInventory;
			})
			.then((json) => {
				if (alive) setInventory(json);
			})
			.catch((e: unknown) => {
				if (alive) setError(String((e as Error).message ?? e));
			});
		return () => {
			alive = false;
		};
	}, []);

	async function resync() {
		setSyncing(true);
		try {
			const response = await fetch("/api/cms/sync", {
				body: JSON.stringify({}),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});
			const json = await response.json();
			if (!response.ok) throw new Error(json.message ?? "Re-sync failed");
			toast.success("Inventory re-synced from the Astro checkout");
			const reload = await fetch("/api/cms/inventory?scope=components,layouts,templates,emails");
			setInventory((await reload.json()) as SyncedInventory);
		} catch (e: unknown) {
			toast.error(String((e as Error).message ?? e));
		} finally {
			setSyncing(false);
		}
	}

	return (
		<section className="mt-10 scroll-mt-24" id="synced">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Synced</p>
					<h2 className="mt-2 text-title font-bold tracking-heading">From the Astro checkout</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Mirrored into SQLite by the FS watcher. Files stay the source of truth.
					</p>
				</div>
				<Button disabled={syncing} onClick={() => void resync()} size="sm" variant="outline">
					<RefreshCwIcon className="size-3.5" />
					{syncing ? "Syncing…" : "Re-sync"}
				</Button>
			</div>

			{error ? (
				<Hint className="mt-4" title="Inventory unavailable" variant="warning">
					{error} Run <code>bun run sync:once</code> to build the SQLite mirror.
				</Hint>
			) : null}

			<div className="mt-4 grid gap-4">
				{inventory === null && !error ? <Skeleton className="h-48 w-full" /> : null}
				{SYNCED_GROUPS.map((group) => {
					const files = inventory?.rows[group.scope] ?? [];
					const synced = lastSyncFor(inventory?.status ?? [], group.scope);
					return (
						<Card key={group.scope}>
							<CardHeader>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<CardTitle>{group.title}</CardTitle>
										<CardDescription className="font-mono text-11">
											src/{group.scope} · {group.description}
										</CardDescription>
									</div>
									<div className="flex items-center gap-1.5">
										<Badge variant="secondary">{files.length} files</Badge>
										<Badge className="font-mono" variant={synced ? "success" : "destructive"}>
											{synced ? `synced ${new Date(synced).toLocaleDateString()}` : "never synced"}
										</Badge>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								{files.length === 0 ? (
									<Hint
										className="m-4"
										title={`No ${group.title.toLowerCase()} found`}
										variant="info"
									>
										{group.scope === "emails"
											? "src/emails is not present in the Astro checkout (react-email is optional)."
											: group.scope === "templates"
												? "src/templates exists but holds no files yet."
												: `No files under src/${group.scope} — the watcher will pick them up when added.`}
									</Hint>
								) : (
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/40 hover:bg-muted/40">
												<TableHead className="pl-5">File</TableHead>
												<TableHead>Details</TableHead>
												<TableHead className="text-right">Updated</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{files.slice(0, 30).map((file) => (
												<TableRow key={file.path}>
													<TableCell className="pl-5">
														<span className="block font-mono text-xs">{file.name}</span>
														<span className="block truncate font-mono text-10 text-muted-foreground">
															{file.path}
														</span>
													</TableCell>
													<TableCell className="text-xs text-muted-foreground">
														{file.props
															? (() => {
																	const props = JSON.parse(file.props) as string[];
																	return (
																		<span>
																			{file.ext} · {props.length}{" "}
																			{props.length === 1 ? "prop" : "props"}
																			{file.hasSlot ? " · slot" : ""}
																		</span>
																	);
																})()
															: file.subject
																? `subject: ${file.subject.slice(0, 60)}`
																: file.ext}
													</TableCell>
													<TableCell className="text-right font-mono text-11">
														{new Date(file.mtime).toLocaleDateString()}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
								{files.length > 30 ? (
									<p className="px-5 py-2 font-mono text-10 text-muted-foreground">
										Showing 30 of {files.length} — refine in the checkout or query the mirror.
									</p>
								) : null}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</section>
	);
}

function ComponentsPage() {
	return (
		<div className="mx-auto w-page px-5 py-8 sm:py-10">
			<div className="animate-rise">
				<p className="text-11 font-bold tracking-14 text-brand uppercase">Components</p>
				<h1 className="gb-display mt-2 text-3xl sm:text-display-sm">
					Building blocks, <span className="text-brand">already assembled.</span>
				</h1>
				<p className="gb-sub mt-3 max-w-xl text-base">
					The same shadcn primitives and GitBook surfaces used across the CMS. Start from a
					template, then drop in the UI piece you need.
				</p>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-1.5">
				<Badge variant="brand">
					<BlocksIcon className="size-3" />
					{primitives.length} primitives
				</Badge>
				<Badge variant="outline">{templates.length} templates</Badge>
				<Badge variant="secondary">shadcn base-nova</Badge>
			</div>

			<SyncedInventorySection />

			<section className="mt-10 scroll-mt-24" id="components">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<p className="text-11 font-bold tracking-14 text-brand uppercase">Surfaces</p>
						<h2 className="mt-2 text-title font-bold tracking-heading">The working set</h2>
					</div>
					<Button nativeButton={false} render={<Link to="/design" />} size="sm" variant="ghost">
						Open full reference
						<ArrowRightIcon className="size-3.5" />
					</Button>
				</div>

				<div className="mt-4 grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Actions</CardTitle>
							<CardDescription>Black finishes the task; outline and ghost undo it.</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center gap-2">
							<Button>Save</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="outline">Outline</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="brand">Brand</Button>
							<Button variant="destructive">Delete</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Fields</CardTitle>
							<CardDescription>36px controls, visible labels, orange focus ring.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<Input placeholder="Title" />
							<Textarea placeholder="Description" />
							<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
								<span className="flex items-center gap-2">
									<Switch aria-label="Publish immediately" defaultChecked /> Publish immediately
								</span>
								<span className="flex items-center gap-2">
									<Checkbox aria-label="Include drafts" defaultChecked /> Include drafts
								</span>
							</div>
						</CardContent>
					</Card>

					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle>Status</CardTitle>
							<CardDescription>Use hints for inline status, not alerts.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2 sm:grid-cols-2">
							<Hint title="Grounded answers" variant="info">
								Every AI answer cites the exact page and section it came from.
							</Hint>
							<Hint title="Review passed" variant="success">
								All checks pass. The content matches the current product.
							</Hint>
							<Hint title="Drift detected" variant="warning">
								Two pages reference a flag that no longer exists.
							</Hint>
							<Hint title="Write blocked" variant="danger">
								The path sits outside the ASTRO_ROOT jail.
							</Hint>
						</CardContent>
					</Card>
				</div>
			</section>

			<section className="mt-12 scroll-mt-24" id="templates">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Templates</p>
					<h2 className="mt-2 text-title font-bold tracking-heading">Pages that already exist</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Every template is a real route. Copy the structure, keep the tokens.
					</p>
				</div>

				<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{templates.map((template) => {
						const Icon = template.icon;
						return (
							<Link
								className="group rounded-xl border border-border bg-card p-5 transition-card hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-soft"
								key={template.label}
								to={template.href as LinkProps["to"]}
							>
								<div className="flex items-start gap-3">
									<span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
										<Icon className="size-4" />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-sm font-bold tracking-tight">{template.label}</span>
										<span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
											{template.description}
										</span>
									</span>
									<ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			<section className="mt-12 scroll-mt-24" id="ui">
				<div>
					<p className="text-11 font-bold tracking-14 text-brand uppercase">UI</p>
					<h2 className="mt-2 text-title font-bold tracking-heading">Primitive index</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						All live in <code>src/components/ui</code> and stay token-first.
					</p>
				</div>

				<Card className="mt-4 overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/40 hover:bg-muted/40">
								<TableHead className="pl-5">Primitive</TableHead>
								<TableHead>Purpose</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{primitives.map((primitive) => (
								<TableRow key={primitive.name}>
									<TableCell className="pl-5 font-mono text-xs">{primitive.name}</TableCell>
									<TableCell className="text-muted-foreground">{primitive.purpose}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>

				<Separator className="my-6" />
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">tokens in src/styles.css</Badge>
					<Badge variant="outline">no arbitrary values</Badge>
					<Badge variant="outline">motion respects reduced-motion</Badge>
					<Button
						className="ml-auto"
						nativeButton={false}
						render={<Link to="/design" hash="components" />}
						size="sm"
						variant="outline"
					>
						See the gallery
						<ArrowRightIcon className="size-3.5" />
					</Button>
				</div>
			</section>
		</div>
	);
}
