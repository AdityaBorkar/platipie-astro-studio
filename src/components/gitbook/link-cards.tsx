import { ArrowUpRightIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

export interface LinkCardItem {
	desc: string;
	href: string;
	icon: LucideIcon;
	title: string;
}

interface LinkCardsProps {
	className?: string;
	items: LinkCardItem[];
}

/**
 * GitBook docs link table: two-up bordered cards with a quiet icon tile and a
 * circular arrow that fills on hover.
 */
export function LinkCards({ items, className }: LinkCardsProps) {
	return (
		<div className={cn("grid gap-3 sm:grid-cols-2", className)}>
			{items.map((item, index) => {
				const Icon = item.icon;
				return (
					<Reveal delay={Math.min(index, 5) * 55} key={item.title}>
						<a
							className="group flex h-full items-start gap-3.5 rounded-xl border border-border bg-card p-4 transition-card hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-muted/40 hover:shadow-soft"
							href={item.href}
						>
							<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors group-hover:border-brand/25 group-hover:bg-brand-soft group-hover:text-brand">
								<Icon className="size-4" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-center gap-1 text-sm font-bold tracking-tight text-foreground">
									{item.title}
									<ArrowUpRightIcon className="size-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
								</span>
								<span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
									{item.desc}
								</span>
							</span>
						</a>
					</Reveal>
				);
			})}
		</div>
	);
}
