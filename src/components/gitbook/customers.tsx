import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { LogoWordmark } from "./logo-cloud";
import { Reveal } from "./motion";

interface CustomersProps {
	className?: string;
	items?: string[];
	title?: string;
}

const defaultItems = ["Acme", "bunq", "FreedomPay", "OpenHQ", "Northwind", "Contoso"];

export function Customers({
	className,
	items = defaultItems,
	title = "Companies like yours are building better docs with platipie",
}: CustomersProps) {
	const trackRef = useRef<HTMLDivElement>(null);
	const [progress, setProgress] = useState(0);

	const updateProgress = useCallback(() => {
		const el = trackRef.current;
		if (!el) return;
		const max = el.scrollWidth - el.clientWidth;
		setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0);
	}, []);

	useEffect(() => {
		updateProgress();
		window.addEventListener("resize", updateProgress);
		return () => window.removeEventListener("resize", updateProgress);
	}, [updateProgress]);

	function nudge(direction: -1 | 1) {
		const el = trackRef.current;
		if (!el) return;
		el.scrollBy({ behavior: "smooth", left: direction * el.clientWidth * 0.8 });
	}

	const active = Math.round(progress * (items.length - 1));

	return (
		<section className={cn("mx-auto w-page px-5 py-12 sm:py-16", className)}>
			<Reveal className="flex flex-wrap items-end justify-between gap-5">
				<div className="max-w-2xl">
					<p className="text-11 font-bold tracking-14 text-brand uppercase">Customers</p>
					<h2 className="mt-3 text-2xl font-bold tracking-heading sm:text-display-sm">{title}</h2>
				</div>
				<Button
					nativeButton={false}
					render={<a aria-label="View all customers" href="/design" />}
					size="sm"
					variant="default"
				>
					View all
					<ArrowRightIcon className="size-3.5" />
				</Button>
			</Reveal>

			<div
				className="gb-scroll-clean mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
				onScroll={updateProgress}
				ref={trackRef}
			>
				{items.map((name) => (
					<a
						className="group relative flex size-64 shrink-0 snap-start flex-col rounded-2xl border border-border bg-muted p-6 transition-card hover:-translate-y-1 hover:border-foreground/15 hover:bg-secondary sm:size-72"
						href="/design"
						key={name}
					>
						<div className="flex flex-1 items-center justify-center">
							<LogoWordmark
								className="text-foreground/70 transition-transform duration-500 group-hover:scale-105 group-hover:text-foreground"
								name={name}
								size="lg"
							/>
						</div>
						<span className="mx-auto inline-flex size-8 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border transition-colors duration-500 group-hover:bg-foreground group-hover:text-background">
							<ArrowUpRightIcon className="size-3.5" />
						</span>
					</a>
				))}
			</div>

			<div className="mt-5 flex items-center justify-between">
				<div aria-hidden="true" className="flex items-center gap-1.5">
					{items.map((name, index) => (
						<span
							className={cn(
								"h-1 rounded-full transition-all duration-500",
								index === active ? "w-6 bg-foreground" : "w-3 bg-foreground/20",
							)}
							key={name}
						/>
					))}
				</div>
				<div className="flex items-center gap-2">
					<Button
						aria-label="Previous customers"
						disabled={progress <= 0.01}
						onClick={() => nudge(-1)}
						size="icon-sm"
						variant="secondary"
					>
						<ArrowLeftIcon className="size-4" />
					</Button>
					<Button
						aria-label="Next customers"
						disabled={progress >= 0.99}
						onClick={() => nudge(1)}
						size="icon-sm"
						variant="secondary"
					>
						<ArrowRightIcon className="size-4" />
					</Button>
				</div>
			</div>
		</section>
	);
}
