import { ArrowUpRightIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

export interface LinkCardItem {
	icon: LucideIcon;
	title: string;
	desc: string;
	href: string;
}

interface LinkCardsProps {
	items: LinkCardItem[];
	className?: string;
}

/** GitBook docs card table: 2-up link cards with hover affordance. */
export function LinkCards({ items, className }: LinkCardsProps) {
	return (
		<div className={cn("grid gap-3 sm:grid-cols-2", className)}>
			{items.map((item, i) => {
				const Icon = item.icon;
				return (
					<Reveal delay={Math.min(i, 5) * 60} key={item.title}>
						<a
							className="gb-card-hover group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4"
							href={item.href}
						>
							<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
								<Icon className="size-4.5" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-center gap-1 text-sm font-semibold text-foreground">
									{item.title}
									<ArrowUpRightIcon className="size-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
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
