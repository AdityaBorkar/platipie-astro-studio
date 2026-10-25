import { createFileRoute } from "@tanstack/react-router";
import {
	ActivityIcon,
	ArrowRightIcon,
	ArrowRightLeftIcon,
	BlocksIcon,
	BotIcon,
	CommandIcon,
	GitBranchIcon,
	GitPullRequestIcon,
	LayersIcon,
	LockIcon,
	PaletteIcon,
	SearchIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TerminalIcon,
	UsersIcon,
	Wand2Icon,
	ZapIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import {
	AgentNetworkArt,
	AgentRow,
	BrandMark,
	Customers,
	DocsNav,
	DocsShell,
	DocsToc,
	EnterpriseGrid,
	FeatureGrid,
	FeatureSplit,
	FinalCta,
	Footer,
	Hero,
	HeroPrimaryAction,
	HeroSecondaryAction,
	Hint,
	LinkCards,
	LogoCloud,
	ProductStage,
	Reveal,
	ShowcaseTabs,
	StaleContentArt,
	Testimonial,
	Wordmark,
} from "#/components/gitbook";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";

export const Route = createFileRoute("/design")({
	component: DesignSystemPage,
	head: () => ({ meta: [{ title: "Design system · platipie-cms" }] }),
});

const footerColumns = [
	{
		links: [
			{ href: "#tokens", label: "Design tokens" },
			{ href: "#components", label: "Components" },
			{ href: "#motion", label: "Motion" },
		],
		title: "System",
	},
	{
		links: [
			{ href: "#patterns", label: "Patterns" },
			{ href: "#docs", label: "Docs shell" },
			{ href: "#tokens", label: "Tokens" },
		],
		title: "Patterns",
	},
	{
		links: [
			{ href: "/dashboard", label: "Dashboard" },
			{ href: "/settings", label: "Settings" },
			{ href: "/design", label: "Reference" },
		],
		title: "Resources",
	},
];

function DesignSystemPage() {
	return (
		<div>
			<div>
				<Hero
					announce={{
						href: "#patterns",
						label: "New",
						shortText: "Content health, built in",
						text: "A content health layer that reviews drift before readers see it",
					}}
					actions={
						<>
							<HeroPrimaryAction href="/dashboard" label="Open dashboard" />
							<HeroSecondaryAction
								href="#tokens"
								icon={<PaletteIcon className="size-4" />}
								label="Browse the system"
							/>
						</>
					}
					sub="platipie keeps the Astro site's docs accurate, for both people and AI. GitBook's flow, warmth, and motion — every value resolved through shadcn tokens."
					title={
						<>
							The content system that flags stale docs.{" "}
							<span className="text-brand">Then fixes them.</span>
						</>
					}
				>
					<ProductStage />
				</Hero>

				<LogoCloud label="Trusted by teams shipping docs with platipie" />

				<AgentRow
					items={[
						{ href: "/design", icon: SparklesIcon, label: "Claude" },
						{ href: "/design", icon: BotIcon, label: "ChatGPT" },
						{ href: "/design", icon: TerminalIcon, label: "Cursor" },
					]}
				/>

				<div className="scroll-mt-24" id="patterns">
					<FeatureSplit
						art={<StaleContentArt />}
						body="When the product changes, docs don't automatically update. platipie spots what drifted and queues it for review before the wrong answer spreads."
						eyebrow="Agent-ready docs"
						title="Agents turn small docs errors into big problems"
					/>

					<FeatureSplit
						art={<AgentNetworkArt />}
						body="Most tools make docs readable by agents. That's the easy part. platipie makes sure what they find is reliable, so when a human or agent follows the instructions, they get the right answer."
						reverse
						title="Readable to an agent isn't the same as useful to a user"
					/>

					<FeatureGrid
						eyebrow="System"
						items={[
							{
								desc: "Sync the repo, then branch, review, and merge documentation like a pull request.",
								icon: GitBranchIcon,
								tag: "Git sync",
								title: "Collaborate on docs like code",
							},
							{
								desc: "Scans the repo for content that no longer matches the product and flags it.",
								icon: SearchIcon,
								tag: "Content health",
								title: "Proactively detect stale content",
							},
							{
								desc: "Readers ask the docs directly and get grounded, personalized support.",
								icon: SparklesIcon,
								tag: "Assistant",
								title: "Turn docs into answers",
							},
							{
								desc: "Tracks where readers and agents get stuck, then shows which content to fix first.",
								icon: ActivityIcon,
								tag: "Insights",
								title: "Know what to fix before users tell you",
							},
						]}
						orbit
						sub="Four flows, one token palette. Hover any card — a four-pixel lift, a darker edge, and a spring ease."
						title="A system built to keep docs accurate, not just create them."
					/>

					<Testimonial
						attribution="Mira Chen"
						company="bunq"
						initials="MC"
						quote="After we started using platipie, our docs stopped drifting. The content health queue catches issues before readers — or their agents — ever see them."
						jobTitle="Docs lead"
					/>

					<EnterpriseGrid
						actions={{ href: "/settings", label: "Get a demo" }}
						features={[
							{
								desc: "White-glove migration, 1:1 support and training, and custom integrations ensure the team is ready to scale fast.",
								icon: ArrowRightLeftIcon,
								title: "Migration and support",
							},
							{
								desc: "SOC 2, ISO 27001, and GDPR compliant, with SAML-based SSO to meet security and data requirements.",
								icon: ShieldCheckIcon,
								title: "Security and compliance",
							},
							{
								desc: "Tiered roles and permissions let you choose precisely who can view and edit every collection.",
								icon: UsersIcon,
								title: "Access control",
							},
							{
								desc: "With authenticated access, only chosen customers, teams, or authorized users can view the docs.",
								icon: LockIcon,
								title: "Auth-protected content",
							},
						]}
						sub="SOC 2, ISO 27001, SAML SSO, access controls, white-glove migration. Built for teams that need security, control, and collaboration."
						title="Enterprise-grade docs that stay accurate at scale"
					/>

					<Customers />
				</div>

				<Reveal className="mx-auto w-page px-5 pt-6">
					<div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
						<div className="flex flex-wrap items-center gap-3">
							<Wordmark badge="design" />
							<span className="text-sm text-muted-foreground">
								The reference page for this design system
							</span>
							<Badge className="ml-auto" variant="brand">
								shadcn tokens
							</Badge>
						</div>
						<div className="mt-5 grid gap-3 sm:grid-cols-3">
							{[
								{
									href: "#tokens",
									icon: PaletteIcon,
									label: "Tokens",
									value: "Warm ink + one orange",
								},
								{
									href: "#components",
									icon: LayersIcon,
									label: "Components",
									value: "30+ shadcn surfaces",
								},
								{
									href: "#motion",
									icon: ZapIcon,
									label: "Motion",
									value: "Spring, reveal, dash",
								},
							].map((item) => {
								const Icon = item.icon;
								return (
									<a
										className="group flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:bg-muted"
										href={item.href}
										key={item.label}
									>
										<span className="inline-flex size-8 items-center justify-center rounded-lg bg-card text-brand ring-1 ring-border">
											<Icon className="size-4" />
										</span>
										<span className="min-w-0">
											<span className="block text-xs font-bold tracking-tight">{item.label}</span>
											<span className="block truncate text-xs text-muted-foreground">
												{item.value}
											</span>
										</span>
										<ArrowRightIcon className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
									</a>
								);
							})}
						</div>
					</div>
				</Reveal>

				<DesignTokens />
				<BrandGuidelines />
				<StyleGuide />
				<DesignLanguages />
				<ComponentsGallery />
				<MotionSection />
				<Viewports />
				<DocsPattern />

				<FinalCta />
			</div>
			<Footer columns={footerColumns} />
		</div>
	);
}

function DesignTokens() {
	return (
		<section className="mx-auto w-page scroll-mt-24 px-5 py-14 sm:py-20" id="tokens">
			<SectionHeader
				eyebrow="Design system"
				sub="GitBook's warmth, mapped onto shadcn variables. Ink is warm stone, paper is off-white, and a single orange carries emphasis — never the primary action."
				title="Tokens that keep the expression consistent"
			/>

			<div className="mt-10 grid gap-4 lg:grid-cols-2">
				<Panel title="Color roles">
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{[
							{ className: "bg-background border border-border", label: "background" },
							{ className: "bg-foreground", label: "foreground" },
							{ className: "bg-brand", label: "brand" },
							{ className: "bg-secondary", label: "secondary" },
							{ className: "bg-muted border border-border", label: "muted" },
							{ className: "bg-border", label: "border" },
							{ className: "bg-brand-mint", label: "mint" },
							{ className: "bg-brand-cream", label: "cream" },
						].map((swatch) => (
							<div key={swatch.label}>
								<div className={`h-10 rounded-lg ${swatch.className}`} />
								<p className="mt-1.5 font-mono text-10 text-muted-foreground">{swatch.label}</p>
							</div>
						))}
					</div>
				</Panel>

				<Panel title="Type scale">
					<div className="grid gap-2.5">
						{[
							{ label: "Display", sample: "Accurate docs.", size: "text-display" },
							{ label: "Section", sample: "Better answers.", size: "text-display-sm" },
							{ label: "Title", sample: "Content health", size: "text-title" },
							{ label: "Body", sample: "Files are the source of truth.", size: "text-base" },
							{ label: "Label", sample: "COLLECTIONS", size: "text-11 uppercase tracking-12" },
						].map((row) => (
							<div className="flex items-baseline justify-between gap-3" key={row.label}>
								<p className={`${row.size} truncate font-bold tracking-heading`}>{row.sample}</p>
								<span className="shrink-0 font-mono text-10 text-muted-foreground">
									{row.label}
								</span>
							</div>
						))}
					</div>
				</Panel>

				<Panel title="Radius & elevation">
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{[
							{ className: "rounded-md", label: "8 · md" },
							{ className: "rounded-lg", label: "12 · lg" },
							{ className: "rounded-xl", label: "16 · xl" },
							{ className: "rounded-2xl", label: "24 · 2xl" },
						].map((radius) => (
							<div
								className={`flex h-16 items-end border border-border bg-muted p-2 text-10 text-muted-foreground ${radius.className}`}
								key={radius.label}
							>
								{radius.label}
							</div>
						))}
					</div>
					<div className="mt-4 grid gap-2 sm:grid-cols-3">
						{[
							{ className: "shadow-soft", label: "shadow-soft" },
							{ className: "shadow-lift", label: "shadow-lift" },
							{ className: "shadow-nav", label: "shadow-nav" },
						].map((shadow) => (
							<div
								className={`rounded-xl border border-border bg-card p-3 font-mono text-10 text-muted-foreground ${shadow.className}`}
								key={shadow.label}
							>
								{shadow.label}
							</div>
						))}
					</div>
				</Panel>

				<Panel title="Spacing & layout">
					<div className="grid gap-2">
						{[
							{ label: "4", width: "w-1" },
							{ label: "8", width: "w-2" },
							{ label: "16", width: "w-4" },
							{ label: "24", width: "w-6" },
							{ label: "48", width: "w-12" },
							{ label: "96", width: "w-24" },
						].map((space) => (
							<div className="flex items-center gap-3" key={space.label}>
								<span className="w-6 font-mono text-10 text-muted-foreground">{space.label}</span>
								<span className={`h-2 rounded-full bg-brand/70 ${space.width}`} />
							</div>
						))}
					</div>
					<div className="mt-4 grid grid-cols-3 gap-2 text-10 text-muted-foreground">
						<span className="rounded-md bg-muted px-2 py-1.5 text-center">page · 1200</span>
						<span className="rounded-md bg-muted px-2 py-1.5 text-center">prose · 720</span>
						<span className="rounded-md bg-muted px-2 py-1.5 text-center">rail · 232</span>
					</div>
				</Panel>
			</div>
		</section>
	);
}

function BrandGuidelines() {
	return (
		<section className="mx-auto w-page scroll-mt-24 px-5 py-14 sm:py-20" id="brand">
			<SectionHeader
				eyebrow="Brand guidelines"
				sub="The mark stays quiet, the wordmark carries the name, and the orange does the pointing. Nothing else competes."
				title="A calm mark for a content system"
			/>

			<div className="mt-10 grid gap-4 lg:grid-cols-3">
				<Panel title="Mark">
					<div className="flex items-center justify-center rounded-xl bg-muted p-8">
						<BrandMark className="size-12 text-foreground" />
					</div>
					<p className="mt-3 text-xs text-muted-foreground">
						Three stacked planes. Never rotate, outline, or recolor the mark outside the semantic
						palette.
					</p>
				</Panel>

				<Panel title="Lockup">
					<div className="flex flex-col items-start gap-4 rounded-xl bg-muted p-6">
						<Wordmark />
						<Wordmark badge="design" />
						<Wordmark badge="cms" />
					</div>
					<p className="mt-3 text-xs text-muted-foreground">
						Mark + name sit on one baseline. Badges are optional mono chips for the surface name.
					</p>
				</Panel>

				<Panel title="Voice">
					<Hint title="Short, concrete, unhurried" variant="info">
						Say what changed, where it lives, and what to do next. Prefer “Files are the source of
						truth” over “revolutionary content platform.”
					</Hint>
					<div className="mt-3 grid gap-2 text-xs text-muted-foreground">
						<p>Use sentence case for headings and buttons.</p>
						<p>Name the file or field when giving an instruction.</p>
						<p>Reserve exclamation marks for nothing.</p>
					</div>
				</Panel>
			</div>
		</section>
	);
}

function StyleGuide() {
	return (
		<section className="mx-auto w-page scroll-mt-24 px-5 py-14 sm:py-20" id="style">
			<SectionHeader
				eyebrow="Style guide"
				sub="Black is the action, orange is the emphasis, and hairline borders keep dense screens readable."
				title="Rules that decide the look"
			/>

			<div className="mt-10 grid gap-4 lg:grid-cols-2">
				<Panel title="Action hierarchy">
					<div className="flex flex-wrap items-center gap-2">
						<Button>Save</Button>
						<Button variant="outline">Cancel</Button>
						<Button variant="ghost">Diff</Button>
						<Button variant="brand">Drift</Button>
						<Badge variant="brand">Emphasis</Badge>
						<Badge variant="success">Clear</Badge>
					</div>
					<ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
						<li>Primary ink for the one action that finishes the task.</li>
						<li>Outline and ghost for everything reversible.</li>
						<li>Orange for attention and brand, never for the main button.</li>
					</ul>
				</Panel>

				<Panel title="Do and don't">
					<div className="grid gap-2">
						<Hint title="Do" variant="success">
							Use a hint for inline status, a card for a decision, and a table for scanning.
						</Hint>
						<Hint title="Don't" variant="danger">
							Stack heavy borders, shadows, and orange on the same surface. Pick one signal.
						</Hint>
						<Hint title="Do" variant="success">
							Keep forms on the app grid: 36px inputs, 12px radius, visible labels.
						</Hint>
						<Hint title="Don't" variant="warning">
							Hide a destructive action behind a hover or an unlabeled icon.
						</Hint>
					</div>
				</Panel>
			</div>
		</section>
	);
}

function DesignLanguages() {
	return (
		<section className="mx-auto w-page scroll-mt-24 px-5 py-14 sm:py-20" id="languages">
			<SectionHeader
				eyebrow="Design languages"
				sub="Three layers, one vocabulary: semantic shadcn variables, Tailwind utilities, and named @utility escape hatches."
				title="How a decision becomes a class"
			/>

			<div className="mt-10 grid gap-4 lg:grid-cols-2">
				<Panel title="Layers">
					<div className="grid gap-2 text-xs">
						{[
							{ detail: "Raw hex lives here once, then flips in .dark", name: "Tokens" },
							{ detail: "@theme inline maps them to color-* utilities", name: "Theme" },
							{ detail: "Components only ever use semantic utilities", name: "Surfaces" },
							{ detail: "Named @utility for repeats, never arbitrary values", name: "Utilities" },
						].map((layer) => (
							<div
								className="flex items-baseline justify-between gap-3 rounded-lg bg-muted px-3 py-2"
								key={layer.name}
							>
								<span className="font-bold text-foreground">{layer.name}</span>
								<span className="text-right text-muted-foreground">{layer.detail}</span>
							</div>
						))}
					</div>
				</Panel>

				<Panel title="Naming rules">
					<ul className="grid gap-2 text-xs text-muted-foreground">
						<li>
							<span className="font-mono text-foreground">--brand</span>,{" "}
							<span className="font-mono text-foreground">--brand-soft</span>, and{" "}
							<span className="font-mono text-foreground">--brand-mint</span> carry emphasis.
						</li>
						<li>
							Roles are semantic: <span className="font-mono text-foreground">background</span>,{" "}
							<span className="font-mono text-foreground">muted</span>,{" "}
							<span className="font-mono text-foreground">border</span>,{" "}
							<span className="font-mono text-foreground">sidebar-accent</span>.
						</li>
						<li>Repeated geometry becomes an @utility, not a comment.</li>
						<li>Imports are sorted and type-only imports are explicit.</li>
					</ul>
				</Panel>
			</div>
		</section>
	);
}

function Viewports() {
	return (
		<section className="mx-auto w-page scroll-mt-24 px-5 py-14 sm:py-20" id="viewports">
			<SectionHeader
				eyebrow="Viewports"
				sub="The app rail is fixed at 264px on large screens. Content stays inside a 75rem page and the editor reserves its own columns."
				title="Space at every width"
			/>

			<div className="mt-10 grid gap-4 lg:grid-cols-2">
				<Panel title="Breakpoints">
					<div className="grid gap-2 text-xs">
						{[
							{ label: "base", value: "0–639 · single column, rows stack" },
							{ label: "sm", value: "640+ · two-up forms and cards" },
							{ label: "md", value: "768+ · sidebar stays a drawer" },
							{ label: "lg", value: "1024+ · fixed 264px app rail" },
							{ label: "xl", value: "1280+ · three-up collection grids" },
						].map((row) => (
							<div
								className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
								key={row.label}
							>
								<span className="font-mono font-bold text-foreground">{row.label}</span>
								<span className="text-right text-muted-foreground">{row.value}</span>
							</div>
						))}
					</div>
				</Panel>

				<Panel title="Rails">
					<div className="grid gap-2">
						{[
							{ label: "App sidebar", value: "264px", width: "w-sidebar" },
							{ label: "Page", value: "1200px", width: "w-page" },
							{ label: "Prose", value: "976px", width: "w-page-narrow" },
						].map((rail) => (
							<div className="grid gap-1" key={rail.label}>
								<div className="flex items-center justify-between text-10 text-muted-foreground">
									<span className="font-mono">{rail.label}</span>
									<span>{rail.value}</span>
								</div>
								<div className={`h-2 rounded-full bg-brand/70 ${rail.width}`} />
							</div>
						))}
					</div>
					<p className="mt-4 text-xs text-muted-foreground">
						Below <span className="font-mono">lg</span>, the sidebar becomes a drawer and the
						content takes the full width under a 48px top bar.
					</p>
				</Panel>
			</div>
		</section>
	);
}

function ComponentsGallery() {
	return (
		<section className="mx-auto w-page scroll-mt-24 px-5 py-14 sm:py-20" id="components">
			<SectionHeader
				eyebrow="Components"
				sub="Everything is a shadcn primitive underneath. GitBook supplies the pill geometry, the hairline borders, and the hover language."
				title="Quiet surfaces, confident affordances"
			/>

			<div className="mt-10 grid gap-4 lg:grid-cols-2">
				<Panel className="lg:col-span-2" title="Buttons">
					<div className="flex flex-wrap items-center gap-2">
						<Button>
							Primary action
							<ArrowRightIcon className="size-3.5" />
						</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="outline">Outline</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="brand">Brand</Button>
						<Button variant="destructive">Destructive</Button>
					</div>
					<div className="mt-4 flex flex-wrap items-center gap-2">
						<Button size="sm">Small</Button>
						<Button>Default</Button>
						<Button size="lg">Large</Button>
						<Button size="icon" variant="outline">
							<CommandIcon className="size-4" />
						</Button>
						<Badge>Default badge</Badge>
						<Badge variant="secondary">Secondary</Badge>
						<Badge variant="outline">Outline</Badge>
						<Badge variant="brand">Brand</Badge>
						<Badge variant="success">Success</Badge>
						<Badge variant="destructive">Danger</Badge>
					</div>
				</Panel>

				<Panel title="Fields">
					<div className="grid gap-3">
						<Input placeholder="Search entries…" />
						<InputGroup>
							<InputGroupAddon>
								<SearchIcon />
							</InputGroupAddon>
							<InputGroupInput placeholder="Filter by title or path" />
						</InputGroup>
						<Textarea placeholder="Write a short description…" />
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span className="flex items-center gap-2">
								<Switch aria-label="Notify on drift" defaultChecked /> Notify on drift
							</span>
							<span className="flex items-center gap-2">
								<Checkbox aria-label="Include drafts" defaultChecked /> Include drafts
							</span>
						</div>
					</div>
				</Panel>

				<Panel title="Callouts">
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
			</div>

			<div className="mt-4 grid gap-4">
				<LinkCards
					items={[
						{
							desc: "Get up and running fast with the quickstart path.",
							href: "#docs",
							icon: ZapIcon,
							title: "Quickstart",
						},
						{
							desc: "Monitor, optimize, and audit the content health layer.",
							href: "#docs",
							icon: BlocksIcon,
							title: "Guides",
						},
						{
							desc: "Let an agent draft the boring parts, then review the diff.",
							href: "#docs",
							icon: Wand2Icon,
							title: "AI workflows",
						},
						{
							desc: "Change requests, comments, and approvals in one place.",
							href: "#docs",
							icon: GitPullRequestIcon,
							title: "Reviews",
						},
					]}
				/>
			</div>

			<ShowcaseTabs
				items={[
					{
						content: (
							<div className="grid gap-3 p-5 sm:p-7">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="brand">
										<GitBranchIcon className="size-3" />
										review/quickstart
									</Badge>
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
									Two pages reference flags that no longer exist in the product. Queued for review.
								</Hint>
								<div className="grid gap-2 rounded-xl border border-border bg-card p-4">
									<p className="text-sm font-bold tracking-tight">Stale-content queue</p>
									<p className="text-xs text-muted-foreground">Oldest drift first</p>
									<div className="mt-1 flex items-center gap-2 text-xs">
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
		</section>
	);
}

function MotionSection() {
	return (
		<section className="mx-auto w-page scroll-mt-24 px-5 py-14 sm:py-20" id="motion">
			<SectionHeader
				eyebrow="Motion"
				sub="Motion resolves content rather than decorating it. Every entrance is transform + opacity, every duration is short, and everything disappears under reduced-motion."
				title="Spring ease, one-shot reveals, marching details"
			/>

			<div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<MotionCard label="Reveal" note="750ms · translate + blur">
					<div className="animate-gb-float rounded-xl border border-border bg-card p-4 shadow-soft">
						<p className="text-xs font-bold">Resolves into place</p>
						<p className="mt-1 text-10 text-muted-foreground">fade · rise · deblur</p>
					</div>
				</MotionCard>
				<MotionCard label="Marching dash" note="1.6s · linear loop">
					<svg className="h-20 w-full" viewBox="0 0 200 80">
						<ellipse className="gb-connector dash-march" cx="100" cy="40" rx="80" ry="28" />
						<circle cx="100" cy="40" fill="var(--brand)" r="3" />
					</svg>
				</MotionCard>
				<MotionCard label="Marquee" note="38s · pause on hover">
					<div className="gb-mask-fade-x overflow-hidden">
						<div className="gb-marquee-track animate-gb-marquee gap-6">
							{["Acme", "bunq", "OpenHQ", "Northwind", "Contoso", "Fabrikam"].map((name) => (
								<span
									className="text-sm font-bold tracking-tight whitespace-nowrap text-muted-foreground"
									key={name}
								>
									{name}
								</span>
							))}
						</div>
					</div>
				</MotionCard>
				<MotionCard label="Brand glow" note="5s · ease-in-out pulse">
					<div className="rounded-full border border-brand/25 bg-brand/5 p-3">
						<div className="animate-gb-glow rounded-full bg-brand/20 px-6 py-3 text-center text-10 font-bold text-brand">
							content health
						</div>
					</div>
				</MotionCard>
			</div>

			<div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
				{[
					{ label: "Durations", value: "220 / 420 / 750ms" },
					{ label: "Easing", value: "spring · out-quint" },
					{ label: "Reduced motion", value: "all disabled" },
				].map((row) => (
					<div key={row.label}>
						<p className="text-10 font-bold tracking-12 text-muted-foreground uppercase">
							{row.label}
						</p>
						<p className="mt-1 font-mono text-xs">{row.value}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function DocsPattern() {
	return (
		<section className="scroll-mt-24" id="docs">
			<div className="mx-auto w-page px-5 pt-6">
				<SectionHeader
					align="left"
					eyebrow="Docs pattern"
					sub="A 232px sticky tree, a 720px prose column, and a 208px TOC rail. The active branch carries an orange rail; everything else stays quiet."
					title="The three-rail documentation shell"
				/>
			</div>
			<DocsShell
				sidebar={
					<DocsNav
						groups={[
							{
								items: [
									{ href: "#docs", label: "Quickstart" },
									{ active: true, href: "#tokens", label: "Design tokens" },
									{ href: "#motion", label: "Motion" },
								],
								title: "Get started",
							},
							{
								items: [
									{ href: "#components", label: "Hints" },
									{ href: "#components", label: "Link cards" },
									{ href: "#components", label: "Tabs" },
								],
								title: "Components",
							},
						]}
					/>
				}
				toc={
					<DocsToc
						items={[
							{ href: "#tokens", label: "Tokens" },
							{ active: true, href: "#motion", label: "Motion" },
							{ href: "#components", label: "Components" },
						]}
					/>
				}
			>
				<article className="max-w-3xl">
					<p className="text-11 font-bold tracking-12 text-brand uppercase">GETTING STARTED</p>
					<h2 className="mt-2 text-3xl font-bold tracking-heading">Design tokens</h2>
					<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
						Every surface in this CMS resolves to a shadcn variable. The palette is warm stone and
						off-white; the brand orange appears only when something needs attention or emphasis.
					</p>
					<div className="mt-5">
						<Hint title="Token-first, always" variant="info">
							Never hard-code a hex value. Use <code>bg-brand</code>,{" "}
							<code>text-muted-foreground</code>, or <code>border-border</code> so both themes stay
							coherent.
						</Hint>
					</div>
					<h3 className="mt-8 text-title font-bold tracking-heading">Color roles</h3>
					<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
						Primary actions are black ink, not orange. Orange is reserved for brand emphasis, drift,
						and agent affordances — the same split GitBook uses.
					</p>
					<pre className="code-surface mt-4 overflow-x-auto p-4 font-mono text-xs">{`:root {
  --background: #ffffff;
  --foreground: #1c1917;
  --brand: #fe551b;
  --secondary: #efeeed;
  --muted: #fafaf9;
  --border: #efeeed;
  --radius: 0.75rem;
}`}</pre>
					<h3 className="mt-8 text-title font-bold tracking-heading">Next</h3>
					<div className="mt-3">
						<LinkCards
							items={[
								{
									desc: "The full component inventory and motion rules.",
									href: "#components",
									icon: LayersIcon,
									title: "Components",
								},
								{
									desc: "Where each token lands in the marketing flow.",
									href: "#patterns",
									icon: BlocksIcon,
									title: "Patterns",
								},
							]}
						/>
					</div>
				</article>
			</DocsShell>
		</section>
	);
}

function SectionHeader({
	align = "center",
	eyebrow,
	sub,
	title,
}: {
	align?: "center" | "left";
	eyebrow: string;
	sub: string;
	title: string;
}) {
	return (
		<div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
			<Reveal>
				<p className="text-11 font-bold tracking-14 text-brand uppercase">{eyebrow}</p>
			</Reveal>
			<Reveal delay={60}>
				<h2 className="mt-3 text-2xl font-bold tracking-heading sm:text-display-sm">{title}</h2>
			</Reveal>
			<Reveal delay={120}>
				<p
					className={`gb-sub mt-4 text-base ${align === "center" ? "mx-auto max-w-xl" : "max-w-xl"}`}
				>
					{sub}
				</p>
			</Reveal>
		</div>
	);
}

function Panel({
	children,
	className,
	title,
}: {
	children: ReactNode;
	className?: string;
	title: string;
}) {
	return (
		<div className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-sm font-bold tracking-tight">{title}</h3>
				<BrandMark className="size-4 text-muted-foreground" title="" />
			</div>
			{children}
		</div>
	);
}

function MotionCard({
	children,
	label,
	note,
}: {
	children: ReactNode;
	label: string;
	note: string;
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<div className="flex h-28 items-center justify-center bg-muted/40 px-4">{children}</div>
			<div className="border-t border-border p-3">
				<p className="text-xs font-bold tracking-tight">{label}</p>
				<p className="mt-0.5 font-mono text-10 text-muted-foreground">{note}</p>
			</div>
		</div>
	);
}
