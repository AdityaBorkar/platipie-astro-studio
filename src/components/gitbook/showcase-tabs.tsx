import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

interface ShowcaseTab {
	content: ReactNode;
	id: string;
	label: string;
}

interface ShowcaseTabsProps {
	defaultId?: string;
	items: ShowcaseTab[];
}

/**
 * GitBook product-tour tabs: a muted pill switcher, a white active pill, and
 * a crossfade panel with a soft lift.
 */
export function ShowcaseTabs({ items, defaultId }: ShowcaseTabsProps) {
	const [active, setActive] = useState(defaultId ?? items[0]?.id);
	const current = items.find((tab) => tab.id === active) ?? items[0];

	return (
		<section className="mx-auto w-page px-5 py-12 sm:py-16">
			<Reveal className="flex justify-center">
				<div
					className="gb-scroll-clean inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-muted p-1 ring-1 ring-border"
					role="tablist"
				>
					{items.map((tab) => {
						const selected = tab.id === active;
						return (
							<button
								aria-selected={selected}
								className={cn(
									"gb-tab-pill shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap",
									selected
										? "bg-card text-foreground shadow-xs ring-1 ring-border"
										: "text-muted-foreground hover:text-foreground",
								)}
								key={tab.id}
								onClick={() => setActive(tab.id)}
								role="tab"
								type="button"
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			</Reveal>
			{current ? (
				<div className="animate-gb-tab-in mt-6" key={current.id} role="tabpanel">
					<div className="gb-frame overflow-hidden rounded-2xl border border-border bg-card">
						{current.content}
					</div>
				</div>
			) : null}
		</section>
	);
}
