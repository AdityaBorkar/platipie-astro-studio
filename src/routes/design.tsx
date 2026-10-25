import { createFileRoute } from "@tanstack/react-router";
import {
	BlocksIcon,
	GitBranchIcon,
	SearchIcon,
	SparklesIcon,
	Wand2Icon,
	ZapIcon,
} from "lucide-react";

import {
	DocsNav,
	DocsShell,
	DocsToc,
	FeatureGrid,
	Footer,
	Hero,
	HeroFrame,
	Hint,
	LinkCards,
	LogoCloud,
	Reveal,
	ShowcaseTabs,
} from "#/components/gitbook";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";

export const Route = createFileRoute("/design")({
	component: DesignSystemPage,
});

const columns = [
	{
		links: [
			{ href: "/design", label: "Design system" },
			{ href: "/", label: "Dashboard" },
			{ href: "/settings", label: "Settings" },
		],
		title: "Product",
	},
	{
		links: [
			{ href: "/design", label: "Hero" },
			{ href: "/design", label: "Bento grid" },
			{ href: "/design", label: "Docs shell" },
		],
		title: "Patterns",
	},
	{
		links: [
			{ href: "/", label: "Collections" },
			{ href: "/settings", label: "Configuration" },
		],
		title: "Resources",
	},
];

function DesignSystemPage() {
	return (
		<div className="-m-4">
			<Hero
				eyebrow="GitBook-inspired · shadcn tokens"
				primaryCta={{ href: "/", label: "Open dashboard" }}
				secondaryCta={{ href: "/settings", label: "View settings" }}
				sub="Soft radii, quiet borders, pill CTAs, spring motion — every value resolves to a shadcn token, so light and dark themes follow automatically."
				title="Docs that stay accurate, for people and AI"
			>
				<HeroFrame>
					<div className="grid gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">ASTRO_ROOT ✓</Badge>
							<Badge className="font-mono" variant="outline">
								~/sites/astro
							</Badge>
							<Badge>AI on (BYOK)</Badge>
						</div>
						<Input placeholder="Search entries… (⌘K)" />
						<Hint title="Proactive review" variant="info">
							GitBook flags content that drifted from the product and queues it for review before
							the wrong answer spreads.
						</Hint>
					</div>
				</HeroFrame>
			</Hero>

			<LogoCloud
				items={["Acme", "bunq", "FreedomPay", "OpenHQ", "Northwind", "Contoso", "Fabrikam"]}
				label="Inspired by teams shipping docs with GitBook"
			/>

			<FeatureGrid
				eyebrow="System"
				items={[
					{
						desc: "Sync your repo, then branch, review, and merge documentation like a pull request.",
						icon: GitBranchIcon,
						span: true,
						title: "Collaborate on docs like code",
					},
					{
						desc: "Scans your docs for content that no longer matches your product and flags it.",
						icon: SearchIcon,
						title: "Proactively detect stale content",
					},
					{
						desc: "Users ask your docs directly and get personalized, grounded answers.",
						icon: SparklesIcon,
						title: "Turn docs into answers",
					},
					{
						desc: "See where readers and agents get stuck, and which content to fix first.",
						icon: ZapIcon,
						title: "Know what to fix first",
					},
				]}
				sub="Four flows, one token palette. Hover any card — lift, border glow, spring ease."
				title="A system built to keep docs accurate"
			/>

			<ShowcaseTabs
				items={[
					{
						content: (
							<div className="grid gap-3 p-4 sm:p-6">
								<Hint title="Tip" variant="success">
									Branch the docs, open a change request, merge when reviewers approve.
								</Hint>
								<div className="flex flex-wrap gap-2">
									<Button className="rounded-full" size="sm">
										New branch
									</Button>
									<Button className="rounded-full" size="sm" variant="outline">
										Request review
									</Button>
									<Button className="rounded-full" size="sm" variant="ghost">
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
							<div className="grid gap-3 p-4 sm:p-6">
								<Hint variant="warning" title="Drift detected">
									2 pages reference flags that no longer exist in the product. Queued for review.
								</Hint>
								<Card className="rounded-xl">
									<CardHeader>
										<CardTitle className="text-sm">Stale-content queue</CardTitle>
										<CardDescription>Oldest drift first</CardDescription>
									</CardHeader>
									<CardContent className="text-sm text-muted-foreground">
										pricing.md · auth.mdx
									</CardContent>
								</Card>
							</div>
						),
						id: "detect",
						label: "Detect drift",
					},
					{
						content: (
							<div className="grid gap-3 p-4 sm:p-6">
								<Hint variant="info" title="Assistant">
									Grounded answers cite the exact page and section they came from.
								</Hint>
								<Input placeholder="Ask your docs…" />
							</div>
						),
						id: "answer",
						label: "Answer",
					},
				]}
			/>

			<section className="mx-auto w-full max-w-6xl px-4 py-12">
				<Reveal>
					<span className="gb-eyebrow">Docs patterns</span>
					<h2 className="gb-display mt-4 max-w-xl text-3xl font-semibold text-balance sm:text-4xl">
						Hints, link cards, and a three-rail shell
					</h2>
				</Reveal>
				<div className="mt-6 grid gap-3">
					<Hint variant="success" title="Readable isn't reliable">
						Most tools make docs readable by agents. GitBook makes sure what they find is reliable.
					</Hint>
					<LinkCards
						items={[
							{
								desc: "Get up and running fast with the quickstart path.",
								href: "/design",
								icon: ZapIcon,
								title: "Quickstart",
							},
							{
								desc: "Monitor, optimize, and audit your knowledge base.",
								href: "/design",
								icon: BlocksIcon,
								title: "Guides",
							},
							{
								desc: "Let an agent draft the boring parts, then review the diff.",
								href: "/design",
								icon: Wand2Icon,
								title: "AI workflows",
							},
							{
								desc: "Change requests, comments, and approvals in one place.",
								href: "/design",
								icon: GitBranchIcon,
								title: "Reviews",
							},
						]}
					/>
				</div>
			</section>

			<DocsShell
				sidebar={
					<DocsNav
						groups={[
							{
								items: [
									{ href: "/design", label: "Quickstart" },
									{ active: true, href: "/design", label: "Design tokens" },
									{ href: "/design", label: "Motion" },
								],
								title: "Get started",
							},
							{
								items: [
									{ href: "/design", label: "Hints" },
									{ href: "/design", label: "Link cards" },
									{ href: "/design", label: "Tabs" },
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
							{ href: "#patterns", label: "Patterns" },
						]}
					/>
				}
			>
				<div className="grid gap-3">
					<h2 className="gb-display text-2xl font-semibold">Design tokens</h2>
					<p className="text-sm leading-relaxed text-muted-foreground">
						Radius, shadow, and motion tokens derive from shadcn variables — no hardcoded palette.
						Cards use soft elevation, pills use full rounding, and every animation respects
						reduced-motion.
					</p>
					<Card className="gb-card-hover rounded-2xl">
						<CardHeader>
							<CardTitle className="text-base">Token flow</CardTitle>
							<CardDescription>shadcn → GitBook expression</CardDescription>
						</CardHeader>
						<CardContent className="font-mono text-xs text-muted-foreground">
							--primary → pills · --border → quiet rings · --muted → fills · --radius → softness
						</CardContent>
					</Card>
				</div>
			</DocsShell>

			<Footer columns={columns} />
		</div>
	);
}
