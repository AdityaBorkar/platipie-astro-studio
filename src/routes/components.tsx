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
	Settings2Icon,
} from "lucide-react";

import { Hint } from "#/components/gitbook/hint";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
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
