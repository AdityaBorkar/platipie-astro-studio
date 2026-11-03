import { ArrowRightIcon, Code2Icon, LayersIcon } from "lucide-react";

import { Hint, PageHeader } from "#/components/gitbook";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { designSections, principles, sources, stats } from "../data";
import { Panel } from "../shared";

export function OverviewSection() {
	return (
		<div className="relative isolate scroll-mt-24" id="overview">
			<div aria-hidden="true" className="page-glow -z-10" />
			<PageHeader
				actions={
					<>
						<Button
							className="h-10 px-5"
							nativeButton={false}
							render={<a aria-label="Browse tokens" href="#tokens" />}
							size="lg"
						>
							Browse tokens
							<ArrowRightIcon />
						</Button>
						<Button
							className="h-10 px-5"
							nativeButton={false}
							render={<a aria-label="Component gallery" href="#components" />}
							size="lg"
							variant="outline"
						>
							Component gallery
						</Button>
					</>
				}
				description={
					<>
						Every surface resolves through the shadcn token layer in <code>src/styles.css</code>.
						This page is the live reference: colors, type, radii, utilities, primitives, GitBook
						surfaces, and the motion that holds them together.
					</>
				}
				eyebrow="Design system · 2026"
				meta={
					<>
						<Badge variant="brand">v1 · shadcn tokens</Badge>
						<Badge variant="outline">Tailwind v4</Badge>
						<Badge variant="outline">General Sans + Geist Mono</Badge>
						<Badge variant="success">Light / dark</Badge>
					</>
				}
				title={
					<>
						Warm stone. One orange. <span className="text-brand">Black actions.</span>
					</>
				}
			/>

			<div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{stats.map((stat) => (
					<div className="rounded-xl border border-border bg-card p-4" key={stat.label}>
						<p className="font-mono text-10 font-bold tracking-12 text-muted-foreground uppercase">
							{stat.label}
						</p>
						<p className="mt-2 text-2xl font-bold tracking-heading">{stat.value}</p>
						<p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stat.detail}</p>
					</div>
				))}
			</div>

			<div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
				<Panel icon={LayersIcon} note="The rules" title="Principles">
					<div className="grid gap-2">
						{principles.map((principle) => {
							const Icon = principle.icon;
							return (
								<div className="flex gap-3 rounded-lg bg-muted/50 p-3" key={principle.title}>
									<span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-card text-brand ring-1 ring-border">
										<Icon className="size-3.5" />
									</span>
									<span className="min-w-0">
										<span className="block text-xs font-bold tracking-tight">
											{principle.title}
										</span>
										<span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
											{principle.body}
										</span>
									</span>
								</div>
							);
						})}
					</div>
				</Panel>

				<Panel icon={Code2Icon} note="Read before editing" title="Source of truth">
					<div className="grid gap-2">
						{sources.map((source) => (
							<div
								className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
								key={source.file}
							>
								<p className="font-mono text-11 font-semibold text-foreground">{source.file}</p>
								<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
									{source.detail}
								</p>
							</div>
						))}
					</div>
					<Hint className="mt-3" title="Token-first, always" variant="info">
						Add a semantic token in <code>:root</code>, <code>.dark</code>, and{" "}
						<code>@theme inline</code>. Never hard-code a hex in a component.
					</Hint>
				</Panel>
			</div>

			<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{designSections.slice(1).map((section) => {
					const Icon = section.icon;
					return (
						<a
							className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-card hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-soft"
							href={section.href}
							key={section.href}
						>
							<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-brand">
								<Icon className="size-4" />
							</span>
							<span className="min-w-0">
								<span className="block text-sm font-bold tracking-tight">{section.label}</span>
								<span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
									{section.note}
								</span>
							</span>
							<ArrowRightIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
						</a>
					);
				})}
			</div>
		</div>
	);
}
