import {
	AccessibilityIcon,
	ArrowRightIcon,
	BlocksIcon,
	Code2Icon,
	CommandIcon,
	ComponentIcon,
	FrameIcon,
	LayersIcon,
	MonitorSmartphoneIcon,
	SparklesIcon,
	SwatchBookIcon,
	ZapIcon,
} from "lucide-react";

import { EmptyState, Hint, LinkCards, ShowcaseTabs } from "#/components/gitbook";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Kbd, KbdGroup } from "#/components/ui/kbd";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Textarea } from "#/components/ui/textarea";
import { DesignSection, Panel } from "../shared";
import { ComponentInventoryPanels } from "./components-primitives";

export function ComponentsSection() {
	return (
		<DesignSection
			description="Everything is a shadcn primitive underneath. GitBook supplies the pill geometry, hairline borders, and hover language. All demos render against the current theme."
			eyebrow="05 · Components"
			id="components"
			title="Quiet surfaces, confident affordances"
		>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel
					className="lg:col-span-2"
					icon={ComponentIcon}
					note="7 variants · 8 sizes"
					title="Buttons"
				>
					<div className="flex flex-wrap items-center gap-2">
						<Button>
							Primary action
							<ArrowRightIcon />
						</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="outline">Outline</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="brand">Brand</Button>
						<Button variant="destructive">Destructive</Button>
						<Button variant="link">Link</Button>
					</div>
					<Separator className="my-4" />
					<div className="flex flex-wrap items-center gap-2">
						<Button size="xs">Extra small</Button>
						<Button size="sm">Small</Button>
						<Button>Default</Button>
						<Button size="lg">Large</Button>
						<Button aria-label="Command" size="icon" variant="outline">
							<CommandIcon className="size-4" />
						</Button>
						<Button aria-label="Command" size="icon-sm" variant="ghost">
							<CommandIcon className="size-3.5" />
						</Button>
					</div>
				</Panel>

				<Panel icon={AccessibilityIcon} note="36px · 12px radius" title="Fields">
					<div className="grid gap-3">
						<Field>
							<FieldLabel htmlFor="design-title">Page title</FieldLabel>
							<Input defaultValue="Design tokens" id="design-title" />
							<FieldDescription>Shown in the page header and the browser tab.</FieldDescription>
						</Field>
						<InputGroup>
							<InputGroupAddon>
								<SwatchBookIcon />
							</InputGroupAddon>
							<InputGroupInput placeholder="Filter tokens, classes, or files" />
						</InputGroup>
						<Textarea placeholder="Write a short description…" />
						<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
							<span className="flex items-center gap-2">
								<Switch aria-label="Notify on drift" defaultChecked /> Notify on drift
							</span>
							<span className="flex items-center gap-2">
								<Checkbox aria-label="Include drafts" defaultChecked /> Include drafts
							</span>
						</div>
					</div>
				</Panel>

				<Panel icon={CommandIcon} note="mono chips" title="Controls & keyboard">
					<div className="grid gap-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">36px control</Badge>
							<Badge variant="brand">orange emphasis</Badge>
							<Badge variant="success">verified</Badge>
							<Badge variant="outline">outline</Badge>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<span>Open the palette</span>
							<KbdGroup>
								<Kbd>Ctrl</Kbd>
								<Kbd>K</Kbd>
							</KbdGroup>
							<span className="mx-1 text-border">·</span>
							<span>Save the page</span>
							<KbdGroup>
								<Kbd>⌘</Kbd>
								<Kbd>S</Kbd>
							</KbdGroup>
						</div>
						<Separator />
						<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							<span className="inline-flex items-center gap-2">
								<Spinner /> Syncing inventory…
							</span>
							<span className="inline-flex items-center gap-2">
								<Skeleton className="h-3 w-16 rounded-full" /> Loading row
							</span>
						</div>
					</div>
				</Panel>

				<Panel icon={SparklesIcon} note="info · success · warning · danger" title="Callouts">
					<div className="grid gap-2">
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
							The path sits outside the <code>project</code> jail.
						</Hint>
					</div>
				</Panel>

				<Panel icon={LayersIcon} note="16px surface" title="Cards">
					<Card className="shadow-soft">
						<CardHeader>
							<CardTitle>Stale content queue</CardTitle>
							<CardDescription>Oldest drift first. Review before it publishes.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2">
							<div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
								<span className="font-mono text-11">pricing.md</span>
								<Badge variant="brand">drift</Badge>
							</div>
							<div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
								<span className="font-mono text-11">auth.mdx</span>
								<Badge variant="success">clear</Badge>
							</div>
						</CardContent>
						<CardFooter className="justify-between gap-2">
							<span className="text-11 text-muted-foreground">2 checks · 1 warning</span>
							<Button size="sm">Review queue</Button>
						</CardFooter>
					</Card>
				</Panel>

				<Panel icon={BlocksIcon} note="muted header rail" title="Tables">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Page</TableHead>
								<TableHead>State</TableHead>
								<TableHead className="hidden sm:table-cell">Updated</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[
								{ page: "/pricing", state: "drift", updated: "2m ago" },
								{ page: "/quickstart", state: "clear", updated: "1h ago" },
								{ page: "/auth", state: "clear", updated: "3h ago" },
							].map((row) => (
								<TableRow key={row.page}>
									<TableCell className="font-mono text-11">{row.page}</TableCell>
									<TableCell>
										<Badge variant={row.state === "drift" ? "brand" : "success"}>{row.state}</Badge>
									</TableCell>
									<TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
										{row.updated}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Panel>

				<Panel icon={FrameIcon} note="neutral, one next step" title="Empty state">
					<EmptyState
						compact
						description="Try a different route or clear the filter."
						icon={SwatchBookIcon}
						title="No tokens match"
					/>
				</Panel>

				<Panel icon={Code2Icon} note="crossfade panels" title="Tabs">
					<Tabs defaultValue="markdown">
						<TabsList>
							<TabsTrigger className="shrink-0" value="markdown">
								Markdown
							</TabsTrigger>
							<TabsTrigger className="shrink-0" value="visual">
								Visual
							</TabsTrigger>
							<TabsTrigger className="shrink-0" value="preview">
								Preview
							</TabsTrigger>
						</TabsList>
						<TabsContent value="markdown">
							<pre className="code-surface mt-2 overflow-x-auto p-3 font-mono text-11">{`# Quickstart

Files are the source of truth.`}</pre>
						</TabsContent>
						<TabsContent value="visual">
							<div className="mt-2 rounded-xl border border-border bg-muted/30 p-4">
								<p className="text-sm font-bold tracking-tight">Quickstart</p>
								<p className="mt-1 text-xs text-muted-foreground">
									A rich-text surface over the same file.
								</p>
							</div>
						</TabsContent>
						<TabsContent value="preview">
							<div className="prose-preview mt-2">
								<h3>Quickstart</h3>
								<p>Files are the source of truth. The CMS is a lens over them.</p>
							</div>
						</TabsContent>
					</Tabs>
				</Panel>

				<Panel icon={LayersIcon} note="popover list" title="Select">
					<div className="grid gap-3">
						<Select defaultValue="published">
							<SelectTrigger className="w-full" id="design-status">
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="draft">draft</SelectItem>
								<SelectItem value="published">published</SelectItem>
								<SelectItem value="scheduled">scheduled</SelectItem>
							</SelectContent>
						</Select>
						<FieldDescription>
							Native-feeling popover with a checked indicator, keyboard navigation, and a portal.
						</FieldDescription>
						<div className="flex flex-wrap gap-1.5">
							<Badge variant="outline">36px trigger</Badge>
							<Badge variant="outline">portal</Badge>
							<Badge variant="outline">checked indicator</Badge>
						</div>
					</div>
				</Panel>
			</div>

			<div className="mt-4 grid gap-4">
				<LinkCards
					items={[
						{
							desc: "The docs shell, page header, and marketing order in one place.",
							href: "#patterns",
							icon: FrameIcon,
							title: "Patterns",
						},
						{
							desc: "Every duration, ease, and keyframe in the system.",
							href: "#motion",
							icon: ZapIcon,
							title: "Motion",
						},
						{
							desc: "Breakpoint behaviour and the 264px app rail.",
							href: "#viewports",
							icon: MonitorSmartphoneIcon,
							title: "Viewports",
						},
						{
							desc: "The primitive index and GitBook modules below.",
							href: "#primitives",
							icon: ComponentIcon,
							title: "Inventory",
						},
					]}
				/>
			</div>

			<div className="mt-4 grid gap-4">
				<ComponentInventoryPanels />
			</div>

			<div className="mt-4">
				<ShowcaseTabs
					items={[
						{
							content: (
								<div className="grid gap-3 p-5 sm:p-7">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="brand">review/quickstart</Badge>
										<Badge variant="secondary">2 checks</Badge>
										<Badge variant="success">Ready to merge</Badge>
									</div>
									<Hint title="Branch, review, merge" variant="success">
										Documentation follows the same flow as code. Reviewers approve the diff before
										anything publishes.
									</Hint>
									<div className="flex flex-wrap gap-2">
										<Button size="sm">New branch</Button>
										<Button size="sm" variant="outline">
											Request review
										</Button>
										<Button size="sm" variant="ghost">
											Merge
										</Button>
									</div>
								</div>
							),
							id: "collaborate",
							label: "Collaborate",
						},
						{
							content: (
								<div className="grid gap-3 p-5 sm:p-7">
									<Hint title="Drift detected" variant="warning">
										Two pages reference flags that no longer exist in the product. Queued for
										review.
									</Hint>
									<div className="grid gap-2 rounded-xl border border-border bg-card p-4">
										<p className="text-sm font-bold tracking-tight">Stale-content queue</p>
										<p className="text-xs text-muted-foreground">Oldest drift first</p>
										<div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
											<span className="rounded-md bg-muted px-2 py-1 font-mono">pricing.md</span>
											<span className="rounded-md bg-muted px-2 py-1 font-mono">auth.mdx</span>
										</div>
									</div>
								</div>
							),
							id: "detect",
							label: "Detect drift",
						},
						{
							content: (
								<div className="grid gap-3 p-5 sm:p-7">
									<Hint title="Assistant" variant="info">
										Grounded answers cite the exact page and section they came from.
									</Hint>
									<InputGroup>
										<InputGroupAddon>
											<SparklesIcon />
										</InputGroupAddon>
										<InputGroupInput placeholder="Ask your docs…" />
									</InputGroup>
								</div>
							),
							id: "answer",
							label: "Answer",
						},
					]}
				/>
			</div>
		</DesignSection>
	);
}
