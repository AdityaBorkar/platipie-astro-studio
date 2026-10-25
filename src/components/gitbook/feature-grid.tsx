import type { LucideIcon } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

export interface FeatureItem {
	icon: LucideIcon;
	title: string;
	desc: string;
	span?: boolean;
}

interface FeatureGridProps {
	eyebrow?: string;
	title?: string;
	sub?: string;
	items: FeatureItem[];
}

/** GitBook bento grid: one wide card + rest, hover lift, token borders. */
export function FeatureGrid({ eyebrow, title, sub, items }: FeatureGridProps) {
	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-12">
			{eyebrow || title || sub ? (
				<div className="max-w-2xl">
					{eyebrow ? (
						<Reveal>
							<span className="gb-eyebrow">{eyebrow}</span>
						</Reveal>
					) : null}
					{title ? (
						<Reveal delay={80}>
							<h2 className="gb-display mt-4 text-3xl font-semibold text-balance sm:text-4xl">
								{title}
							</h2>
						</Reveal>
					) : null}
					{sub ? (
						<Reveal delay={140}>
							<p className="gb-sub mt-3 text-base">{sub}</p>
						</Reveal>
					) : null}
				</div>
			) : null}
			<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{items.map((item, i) => {
					const Icon = item.icon;
					return (
						<Reveal delay={Math.min(i, 5) * 70} key={item.title}>
							<Card
								className={cn(
									"gb-card-hover h-full rounded-2xl p-2",
									item.span && "sm:col-span-2 lg:col-span-2",
								)}
							>
								<CardHeader>
									<span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
										<Icon className="size-4.5" />
									</span>
									<CardTitle className="mt-1 text-lg">{item.title}</CardTitle>
									<CardDescription className="text-sm leading-relaxed">{item.desc}</CardDescription>
								</CardHeader>
							</Card>
						</Reveal>
					);
				})}
			</div>
		</section>
	);
}
