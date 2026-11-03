import { BlocksIcon, ComponentIcon, FrameIcon } from "lucide-react";

import { BrandMark, DocsNav, DocsToc, Hint, SectionHeader } from "#/components/gitbook";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { docsGroups, docsToc, marketingFlow } from "../data";
import { DesignSection, Panel } from "../shared";

export function PatternsSection() {
	return (
		<DesignSection
			description="Compositions combine the tokens and primitives into the app shell, the docs shell, and the marketing flow. These are the patterns to copy, not reinvent."
			eyebrow="08 · Patterns"
			id="patterns"
			title="The three shells and the marketing order"
		>
			<Panel icon={FrameIcon} note="232 / 1fr / 208" title="Docs shell">
				<div className="overflow-hidden rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
					<div className="grid gap-4 lg:grid-cols-docs-shell xl:grid-cols-docs-wide">
						<aside className="hidden lg:block">
							<DocsNav groups={docsGroups} />
						</aside>
						<article className="min-w-0 rounded-lg border border-border bg-background p-4 sm:p-5">
							<p className="text-11 font-bold tracking-12 text-brand uppercase">Getting started</p>
							<h3 className="mt-2 text-2xl font-bold tracking-heading">Design tokens</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								Every surface resolves to a shadcn variable. The palette is warm stone and
								off-white; the orange appears only when something needs attention.
							</p>
							<Hint className="mt-4" title="Token-first, always" variant="info">
								Use <code>bg-brand</code>, <code>text-muted-foreground</code>, or{" "}
								<code>border-border</code> so both themes stay coherent.
							</Hint>
							<div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
								<p className="text-xs font-bold tracking-tight">Next</p>
								<div className="mt-2 flex flex-wrap gap-1.5">
									<Badge variant="outline">Components</Badge>
									<Badge variant="outline">Motion</Badge>
									<Badge variant="outline">Patterns</Badge>
								</div>
							</div>
						</article>
						<aside className="hidden xl:block">
							<DocsToc items={docsToc} />
						</aside>
					</div>
				</div>
				<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
					The tree pins at <code>top-24</code> and both rails cap at <code>max-h-docs-rail</code>.
					The active branch carries an orange rail; everything else stays quiet.
				</p>
			</Panel>

			<div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={ComponentIcon} note="PageShell + PageHeader" title="App page anatomy">
					<div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
						<p className="text-11 font-bold tracking-14 text-brand uppercase">App page</p>
						<p className="mt-2 text-2xl font-bold tracking-heading">Pages</p>
						<p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
							Astro routes, metadata, and the SEO rail. One header rhythm on every route.
						</p>
						<div className="mt-3 flex flex-wrap items-center gap-1.5">
							<Badge variant="success">synced 2m ago</Badge>
							<Badge variant="outline">18 pages</Badge>
							<Button size="sm">Sync now</Button>
						</div>
						<Separator className="my-4" />
						<SectionHeader
							description="The in-page heading keeps eyebrow, title, and action aligned."
							eyebrow="In-page section"
							title="Shared section heading"
						/>
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						Every app page renders inside <code>PageShell</code> and opens with{" "}
						<code>PageHeader</code>. Dense forms skip <code>Reveal</code>.
					</p>
				</Panel>

				<Panel icon={FrameIcon} note="fixed rail + content" title="App shell">
					<div className="overflow-hidden rounded-xl border border-border">
						<div className="flex items-center gap-2 border-b border-border bg-sidebar px-3 py-2">
							<BrandMark className="size-4 text-brand" />
							<span className="text-xs font-bold">platipie-cms</span>
							<Badge className="ml-auto font-mono" variant="outline">
								main
							</Badge>
						</div>
						<div className="flex">
							<div className="grid w-1/3 gap-1.5 border-r border-sidebar-border bg-sidebar p-2">
								{["Dashboard", "Pages", "Content", "Assets", "Design"].map((item) => (
									<span
										className={cn(
											"rounded-md px-2 py-1 text-10",
											item === "Design"
												? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
												: "text-muted-foreground",
										)}
										key={item}
									>
										{item}
									</span>
								))}
							</div>
							<div className="min-w-0 flex-1 p-3">
								<p className="text-10 font-bold tracking-12 text-muted-foreground uppercase">
									App page
								</p>
								<p className="mt-1 text-sm font-bold tracking-tight">Content</p>
								<div className="mt-2 grid gap-1.5">
									<div className="h-1.5 w-3/4 rounded-full bg-muted" />
									<div className="h-1.5 w-full rounded-full bg-muted" />
									<div className="h-1.5 w-5/6 rounded-full bg-muted" />
								</div>
							</div>
						</div>
					</div>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						A 264px fixed rail on <code>lg</code>, a 48px top bar below it, and{" "}
						<code>lg:pl-sidebar</code> on the content. The rail holds identity, nav, and sync
						freshness.
					</p>
				</Panel>
			</div>

			<div className="mt-4">
				<Panel icon={BlocksIcon} note="GitBook order" title="Marketing composition">
					<ol className="grid gap-2 sm:grid-cols-2">
						{marketingFlow.map((item) => (
							<li
								className="flex gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5"
								key={item.step}
							>
								<span className="font-mono text-10 font-bold text-brand">{item.step}</span>
								<span className="min-w-0">
									<span className="block text-xs font-bold tracking-tight">{item.title}</span>
									<span className="mt-0.5 block font-mono text-9 text-muted-foreground">
										{item.components}
									</span>
								</span>
							</li>
						))}
					</ol>
					<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
						The marketing flow lives on the public site. Keep the order, spacing, and orange
						emphasis intact when recreating it here.
					</p>
				</Panel>
			</div>
		</DesignSection>
	);
}
