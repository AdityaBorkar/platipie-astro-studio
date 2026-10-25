import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

interface ShowcaseTab {
	id: string;
	label: string;
	content: ReactNode;
}

interface ShowcaseTabsProps {
	items: ShowcaseTab[];
	defaultId?: string;
}

/** GitBook product-tour tabs: pill switcher with spring crossfade panels. */
export function ShowcaseTabs({ items, defaultId }: ShowcaseTabsProps) {
	const [active, setActive] = useState(defaultId ?? items[0]?.id);
	const current = items.find((t) => t.id === active) ?? items[0];

	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-12">
			<Reveal className="flex justify-center">
				<div
					className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-muted/60 p-1"
					role="tablist"
				>
					{items.map((t) => {
						const selected = t.id === active;
						return (
							<button
								aria-selected={selected}
								className={cn(
									"gb-tab-pill shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap",
									selected
										? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
										: "text-muted-foreground hover:text-foreground",
								)}
								key={t.id}
								onClick={() => setActive(t.id)}
								role="tab"
								type="button"
							>
								{t.label}
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
