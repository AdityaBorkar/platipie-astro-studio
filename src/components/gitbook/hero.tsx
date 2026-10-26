import type { ReactNode } from "react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

interface HeroProps {
	actions?: ReactNode;
	announce?: {
		href?: string;
		label?: string;
		shortText?: string;
		text: string;
	};
	children?: ReactNode;
	className?: string;
	sub?: ReactNode;
	title: ReactNode;
}

export function Hero({ announce, title, sub, actions, children, className }: HeroProps) {
	return (
		<section className={cn("relative overflow-hidden px-5 pt-14 pb-12 sm:pt-20", className)}>
			<div aria-hidden="true" className="page-glow" />
			<div className="relative mx-auto w-page text-center">
				{announce ? (
					<Reveal>
						<a
							className="group inline-flex max-w-full items-center gap-2 rounded-full bg-muted/80 py-1 pr-3.5 pl-1 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-card hover:ring-foreground/15"
							href={announce.href ?? "#"}
						>
							<span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-brand-foreground">
								{announce.label ?? "New"}
							</span>
							<span className="hidden truncate text-muted-foreground transition-colors group-hover:text-foreground sm:inline">
								{announce.text}
							</span>
							<span className="truncate text-muted-foreground transition-colors group-hover:text-foreground sm:hidden">
								{announce.shortText ?? announce.text}
							</span>
							<span aria-hidden="true" className="text-muted-foreground">
								→
							</span>
						</a>
					</Reveal>
				) : null}

				<Reveal delay={70}>
					<h1 className="gb-display mx-auto mt-6 max-w-3xl text-3xl sm:text-display">{title}</h1>
				</Reveal>

				{sub ? (
					<Reveal delay={140}>
						<p className="gb-sub mx-auto mt-5 max-w-2xl text-base sm:text-lg">{sub}</p>
					</Reveal>
				) : null}

				{actions ? (
					<Reveal delay={210}>
						<div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">{actions}</div>
					</Reveal>
				) : null}

				{children ? <Reveal delay={280}>{children}</Reveal> : null}
			</div>
		</section>
	);
}

interface HeroFrameProps {
	children: ReactNode;
	className?: string;
	label?: string;
}

export function HeroFrame({ children, className, label = "app.platipie.local" }: HeroFrameProps) {
	return (
		<div
			className={cn(
				"gb-frame overflow-hidden rounded-2xl border border-border/80 bg-card p-1.5 text-left",
				className,
			)}
		>
			<div className="flex items-center gap-2 px-2 py-1.5">
				<span aria-hidden="true" className="size-2.5 rounded-full bg-destructive/70" />
				<span aria-hidden="true" className="size-2.5 rounded-full bg-warning/80" />
				<span aria-hidden="true" className="size-2.5 rounded-full bg-brand-mint" />
				<span className="mx-auto inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1 font-mono text-10 text-muted-foreground">
					<span className="size-1.5 rounded-full bg-brand-mint" />
					{label}
				</span>
				<span className="w-12" />
			</div>
			<div className="overflow-hidden rounded-xl border border-border bg-background">
				{children}
			</div>
		</div>
	);
}

export function HeroPrimaryAction({
	href,
	label,
	icon,
}: {
	href: string;
	icon?: ReactNode;
	label: string;
}) {
	return (
		<Button
			className="h-10 rounded-full px-5"
			nativeButton={false}
			render={<a aria-label={label} href={href} />}
			size="lg"
		>
			{icon}
			{label}
			<span
				aria-hidden="true"
				className="transition-transform duration-300 group-hover/button:translate-x-0.5"
			>
				→
			</span>
		</Button>
	);
}

export function HeroSecondaryAction({
	href,
	label,
	icon,
}: {
	href: string;
	icon?: ReactNode;
	label: string;
}) {
	return (
		<Button
			className="h-10 rounded-full px-5"
			nativeButton={false}
			render={<a aria-label={label} href={href} />}
			size="lg"
			variant="secondary"
		>
			{icon}
			{label}
		</Button>
	);
}
