import type { ReactNode } from "react";

import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

interface FeatureSplitProps {
	art: ReactNode;
	body: ReactNode;
	bullets?: string[];
	className?: string;
	eyebrow?: string;
	reverse?: boolean;
	title: ReactNode;
}

export function FeatureSplit({
	art,
	body,
	bullets,
	className,
	eyebrow,
	reverse,
	title,
}: FeatureSplitProps) {
	return (
		<section className={cn("mx-auto w-page px-5 py-10 sm:py-14", className)}>
			<div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
				<Reveal className={cn(reverse && "lg:order-2")}>
					<div className="max-w-lg">
						{eyebrow ? (
							<p className="text-11 font-bold tracking-14 text-brand uppercase">{eyebrow}</p>
						) : null}
						<h2 className="mt-3 text-2xl font-bold tracking-heading sm:text-heading">{title}</h2>
						<div className="gb-sub mt-4 text-base">{body}</div>
						{bullets && bullets.length > 0 ? (
							<ul className="mt-5 grid gap-2">
								{bullets.map((bullet) => (
									<li className="flex items-start gap-2 text-sm text-muted-foreground" key={bullet}>
										<span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
											<span className="size-1.5 rounded-full bg-brand" />
										</span>
										{bullet}
									</li>
								))}
							</ul>
						) : null}
					</div>
				</Reveal>
				<Reveal delay={90} className={cn(reverse && "lg:order-1")}>
					{art}
				</Reveal>
			</div>
		</section>
	);
}
