import type { LucideIcon } from "lucide-react";

import { cn } from "#/lib/utils";
import { IconTile, SystemOrbit } from "./illustrations";
import { Reveal } from "./motion";

export interface FeatureItem {
	desc: string;
	icon: LucideIcon;
	span?: boolean;
	tag: string;
	title: string;
}

interface FeatureGridProps {
	className?: string;
	eyebrow?: string;
	items: FeatureItem[];
	orbit?: boolean;
	sub?: string;
	title?: string;
}

/**
 * The four-up bento from GitBook's product section: plain icon, 20px title,
 * muted body, and a soft pill label pinned to the bottom. Cards lift a few
 * pixels and darken their edge on hover.
 */
export function FeatureGrid({
	className,
	eyebrow,
	items,
	orbit = false,
	sub,
	title,
}: FeatureGridProps) {
	return (
		<section className={cn("mx-auto w-page px-5 py-12 sm:py-16", className)}>
			{title || sub ? (
				<div className="mx-auto max-w-2xl text-center">
					{eyebrow ? (
						<Reveal>
							<p className="text-11 font-bold tracking-14 text-brand uppercase">{eyebrow}</p>
						</Reveal>
					) : null}
					{title ? (
						<Reveal delay={60}>
							<h2 className="mt-3 text-2xl font-bold tracking-heading sm:text-display-sm">
								{title}
							</h2>
						</Reveal>
					) : null}
					{sub ? (
						<Reveal delay={120}>
							<p className="gb-sub mx-auto mt-4 max-w-xl text-base">{sub}</p>
						</Reveal>
					) : null}
				</div>
			) : null}

			{orbit ? (
				<Reveal className="mt-8">
					<SystemOrbit />
				</Reveal>
			) : null}

			<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{items.map((item, index) => {
					const Icon = item.icon;
					return (
						<Reveal delay={Math.min(index, 5) * 65} key={item.title}>
							<article
								className={cn(
									"gb-card-hover group flex h-full flex-col rounded-xl border border-border bg-card p-6",
									item.span && "lg:col-span-2",
								)}
							>
								<Icon className="size-6 text-foreground" />
								<h3 className="mt-6 max-w-56 text-title leading-snug font-bold tracking-heading">
									{item.title}
								</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
								<span className="mt-auto inline-flex w-fit items-center rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-colors group-hover:bg-secondary">
									{item.tag}
								</span>
							</article>
						</Reveal>
					);
				})}
			</div>
		</section>
	);
}

/** Compact two-column feature list used inside docs surfaces. */
export function MiniFeatures({
	items,
}: {
	items: { icon: LucideIcon; title: string; desc: string }[];
}) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{items.map((item) => {
				const Icon = item.icon;
				return (
					<div className="flex gap-3 rounded-xl border border-border bg-card p-4" key={item.title}>
						<IconTile icon={Icon} />
						<div>
							<p className="text-sm font-bold tracking-tight">{item.title}</p>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}
