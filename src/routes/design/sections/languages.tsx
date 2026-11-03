import { ChevronRightIcon, Code2Icon, ComponentIcon, LayersIcon } from "lucide-react";

import { Hint } from "#/components/gitbook";
import { utilityGroups } from "../data";
import { DesignSection, Panel, CodeBlock } from "../shared";

export function LanguagesSection() {
	return (
		<DesignSection
			description="Three layers, one vocabulary: raw values in :root, semantic shadcn variables in @theme, and named @utility escape hatches. Components only ever use the semantic classes."
			eyebrow="04 · Design languages"
			id="languages"
			title="How a decision becomes a class"
		>
			<div className="grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={LayersIcon} note="never skip a layer" title="Layers">
					<div className="grid gap-2">
						{[
							{
								detail: "Raw hex and cubic-bezier values live here once, then flip in .dark",
								name: "Tokens",
							},
							{
								detail: "@theme inline maps them to color-*, text-*, tracking-*, and radius-*",
								name: "Theme",
							},
							{
								detail: "@utility names repeated geometry, motion, and elevation",
								name: "Utilities",
							},
							{
								detail: "Components use only semantic utilities and named tokens",
								name: "Surfaces",
							},
						].map((layer, index) => (
							<div
								className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
								key={layer.name}
							>
								<span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-card font-mono text-10 font-bold text-muted-foreground ring-1 ring-border">
									{index + 1}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-xs font-bold text-foreground">{layer.name}</span>
									<span className="block text-11 leading-relaxed text-muted-foreground">
										{layer.detail}
									</span>
								</span>
								<ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
							</div>
						))}
					</div>
				</Panel>

				<Panel icon={Code2Icon} note="semantic first" title="Naming rules">
					<ul className="grid gap-2 text-xs text-muted-foreground">
						<li>
							<span className="font-mono text-foreground">--brand</span>,{" "}
							<span className="font-mono text-foreground">--brand-soft</span>, and{" "}
							<span className="font-mono text-foreground">--brand-mint</span> carry emphasis.
						</li>
						<li>
							Roles stay semantic: <span className="font-mono text-foreground">background</span>,{" "}
							<span className="font-mono text-foreground">muted</span>,{" "}
							<span className="font-mono text-foreground">border</span>,{" "}
							<span className="font-mono text-foreground">sidebar-accent</span>.
						</li>
						<li>Repeated geometry becomes an @utility, not a comment.</li>
						<li>Imports are sorted; type-only imports are explicit.</li>
						<li>
							ARIA states use <span className="font-mono text-foreground">data-*</span> variants,
							never a parallel color token.
						</li>
					</ul>
					<CodeBlock className="mt-4" label="Decision → class">
						{`/* 1. token */      --brand: #fe551b;
/* 2. theme */      --color-brand: var(--brand);
/* 3. utility */  @utility w-page { width: min(100%, 75rem); }
/* 4. surface */  className="bg-brand text-on-brand"`}
					</CodeBlock>
				</Panel>
			</div>

			<div className="mt-4">
				<Panel
					icon={ComponentIcon}
					note={`${utilityGroups.reduce((sum, group) => sum + group.items.length, 0)} named utilities`}
					title="Utility inventory"
				>
					<div className="grid gap-3 lg:grid-cols-2">
						{utilityGroups.map((group) => (
							<div className="rounded-xl border border-border bg-muted/30 p-3" key={group.label}>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<p className="text-xs font-bold tracking-tight">{group.label}</p>
									<span className="font-mono text-9 text-muted-foreground">
										{group.items.length}
									</span>
								</div>
								<p className="mt-0.5 text-11 text-muted-foreground">{group.note}</p>
								<div className="mt-2 flex flex-wrap gap-1">
									{group.items.map((utility) => (
										<code
											className="rounded-md bg-card px-1.5 py-0.5 font-mono text-9 text-foreground ring-1 ring-border"
											key={utility}
										>
											{utility}
										</code>
									))}
								</div>
							</div>
						))}
					</div>
					<Hint className="mt-3" title="No arbitrary values" variant="warning">
						If a Tailwind value is not on the scale, add a named <code>@utility</code> in{" "}
						<code>src/styles.css</code>. The Tailwind lint rules reject arbitrary values.
					</Hint>
				</Panel>
			</div>
		</DesignSection>
	);
}
