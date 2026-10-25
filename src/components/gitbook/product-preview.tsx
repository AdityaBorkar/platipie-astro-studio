import {
	BookOpenIcon,
	ChevronRightIcon,
	CircleCheckIcon,
	FileTextIcon,
	GitBranchIcon,
	ImageIcon,
	LayoutGridIcon,
	LockIcon,
	SearchIcon,
	SendHorizontalIcon,
	SettingsIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TriangleAlertIcon,
} from "lucide-react";

import { cn } from "#/lib/utils";
import { BrandMark } from "./brand";
import { HeroFrame } from "./hero";

const navGroups = [
	{
		items: [
			{ active: true, icon: BookOpenIcon, label: "Welcome" },
			{ icon: SparklesIcon, label: "Quickstart" },
			{ icon: LayoutGridIcon, label: "Concepts" },
			{ icon: GitBranchIcon, label: "System performance" },
		],
		title: "Getting started",
	},
	{
		items: [
			{ icon: ShieldCheckIcon, label: "Overview" },
			{ icon: LockIcon, label: "Security best practices" },
			{ icon: SettingsIcon, label: "System hardening" },
		],
		title: "Security",
	},
	{
		items: [
			{ icon: FileTextIcon, label: "Audit and logging" },
			{ icon: ImageIcon, label: "Custom domain" },
		],
		title: "Customization",
	},
];

/** A static, CSS-only replica of a docs workspace for the hero stage. */
export function ProductDemo({ className }: { className?: string }) {
	return (
		<div className={cn("relative bg-card text-left text-13 text-foreground", className)}>
			<div className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
				<span className="inline-flex items-center gap-1.5 font-bold tracking-tight">
					<span className="inline-flex size-6 items-center justify-center rounded-md bg-foreground text-background">
						<BrandMark className="size-4" title="" />
					</span>
					Acme
				</span>
				<div className="hidden items-center gap-1 sm:flex">
					<span className="inline-flex h-7 items-center gap-1 border-b-2 border-brand px-2 text-xs font-semibold text-foreground">
						<BookOpenIcon className="size-3 text-brand" />
						Product
					</span>
					<span className="inline-flex h-7 items-center gap-1 px-2 text-xs text-muted-foreground">
						<span className="font-mono text-10">{"</>"}</span> API
					</span>
					<span className="inline-flex h-7 items-center gap-1 px-2 text-xs text-muted-foreground">
						<SparklesIcon className="size-3" />
						Help center
					</span>
					<span className="inline-flex h-7 items-center gap-1 px-2 text-xs text-muted-foreground">
						<LayoutGridIcon className="size-3" />
						Changelog
					</span>
				</div>
				<div className="ml-auto flex items-center gap-2">
					<span className="hidden h-7 items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 text-11 text-muted-foreground lg:inline-flex">
						<SearchIcon className="size-3" />
						Search...
						<span className="ml-10 inline-flex gap-0.5 font-mono text-9">
							<kbd className="rounded border border-border bg-card px-1">Ctrl</kbd>
							<kbd className="rounded border border-border bg-card px-1">K</kbd>
						</span>
					</span>
					<span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-soft px-2.5 text-11 font-semibold text-brand">
						<SparklesIcon className="size-3" />
						Ask
					</span>
					<span className="hidden h-7 items-center rounded-md border border-border px-2 text-11 font-semibold sm:inline-flex">
						Sign in
					</span>
				</div>
			</div>

			<div className="grid sm:grid-cols-product lg:grid-cols-product-wide">
				<aside className="hidden border-r border-border bg-muted/30 p-3 sm:block">
					{navGroups.map((group) => (
						<div className="mb-3" key={group.title}>
							<p className="mb-1 px-1.5 text-9 font-bold tracking-12 text-muted-foreground uppercase">
								{group.title}
							</p>
							<ul className="grid gap-0.5">
								{group.items.map((item) => {
									const Icon = item.icon;
									return (
										<li key={item.label}>
											<span
												className={cn(
													"flex items-center gap-1.5 rounded-md px-1.5 py-1 text-11",
													item.active
														? "bg-brand-soft font-semibold text-brand"
														: "text-muted-foreground",
												)}
											>
												<Icon className="size-3 shrink-0" />
												<span className="truncate">{item.label}</span>
											</span>
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</aside>

				<main className="relative min-w-0 p-4 sm:px-6 sm:py-5">
					<p className="text-9 font-bold tracking-12 text-muted-foreground uppercase">
						Getting started
					</p>
					<h3 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">Welcome to Acme</h3>
					<p className="mt-1.5 max-w-lg text-11 leading-relaxed text-muted-foreground sm:text-xs">
						Acme is an open-source, distributed operating system incubated and operated by the
						OpenHQ Foundation.
					</p>

					<div className="mt-4 grid grid-cols-2 gap-2">
						{[
							{
								desc: "Get up and running fast with Acme.",
								icon: SparklesIcon,
								title: "Quickstart",
							},
							{
								desc: "Monitor and optimize your system.",
								icon: ShieldCheckIcon,
								title: "Security",
							},
						].map((card) => {
							const Icon = card.icon;
							return (
								<div
									className="relative overflow-hidden rounded-lg border border-border bg-muted/30 p-3"
									key={card.title}
								>
									<div
										aria-hidden="true"
										className="absolute inset-x-3 top-0 h-8 border-x border-b border-dashed border-brand/40"
									/>
									<span className="relative inline-flex size-7 items-center justify-center rounded-md border border-brand/20 bg-brand-soft text-brand">
										<Icon className="size-3.5" />
									</span>
									<p className="relative mt-2 text-xs font-bold tracking-tight">{card.title}</p>
									<p className="relative mt-0.5 text-10 leading-relaxed text-muted-foreground">
										{card.desc}
									</p>
								</div>
							);
						})}
					</div>

					<div className="mt-3 flex items-center gap-2 rounded-md border border-brand/20 bg-brand-soft px-2.5 py-1.5 text-10 text-brand">
						<TriangleAlertIcon className="size-3 shrink-0" />
						<span className="truncate">1 page references a flag that no longer exists</span>
						<span className="ml-auto hidden font-semibold sm:inline">Review</span>
					</div>

					<div className="mt-3 grid gap-1.5">
						<div className="h-1.5 w-11/12 rounded-full bg-muted" />
						<div className="h-1.5 w-full rounded-full bg-muted" />
						<div className="h-1.5 w-4/5 rounded-full bg-muted" />
					</div>
				</main>

				<aside className="hidden border-l border-border px-3 py-4 lg:block">
					<p className="text-11 font-bold tracking-tight">Good morning</p>
					<p className="mt-0.5 text-10 leading-relaxed text-muted-foreground">
						I&apos;m here to help you with the docs.
					</p>
					<div className="mt-3 grid gap-1.5">
						{[
							"What is Acme Assistant?",
							"How does the review queue work?",
							"How do I get started with Acme?",
						].map((q) => (
							<span
								className="rounded-md bg-brand-soft px-2 py-1.5 text-10 leading-snug text-foreground"
								key={q}
							>
								{q}
							</span>
						))}
					</div>
					<div className="mt-3 rounded-lg border border-brand/35 p-2">
						<p className="text-10 text-muted-foreground">Ask, search, or explain...</p>
						<div className="mt-3 flex items-center justify-between">
							<span className="inline-flex items-center gap-1 text-9 text-muted-foreground">
								<SparklesIcon className="size-2.5 text-brand" />
								Based on your context
							</span>
							<span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-1.5 py-0.5 text-9 font-semibold text-brand">
								Send
								<SendHorizontalIcon className="size-2.5" />
							</span>
						</div>
					</div>
				</aside>
			</div>

			{/* Floating status pill, echoing GitBook's assistant chip. */}
			<div className="pointer-events-none absolute right-5 bottom-3 hidden items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-10 font-semibold text-background shadow-lift sm:flex">
				<CircleCheckIcon className="size-3 text-brand-mint" />
				Content health
				<ChevronRightIcon className="size-3" />
			</div>
		</div>
	);
}

/** Orange halo + browser frame + workspace demo — the hero's product stage. */
export function ProductStage({ className }: { className?: string }) {
	return (
		<div className={cn("gb-stage relative mx-auto mt-12 w-full max-w-6xl", className)}>
			<div aria-hidden="true" className="gb-halo" />
			<HeroFrame>
				<ProductDemo />
			</HeroFrame>
		</div>
	);
}
