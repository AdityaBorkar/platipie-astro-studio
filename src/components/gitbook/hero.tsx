import type { ReactNode } from "react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

interface HeroProps {
	eyebrow?: ReactNode;
	title: ReactNode;
	sub?: ReactNode;
	primaryCta?: { href: string; label: string };
	secondaryCta?: { href: string; label: string };
	children?: ReactNode;
	align?: "center" | "left";
}

/**
 * GitBook marketing hero: centered eyebrow pill, tight display type, muted
 * sub-copy, dual pill CTAs, optional product frame slot below.
 */
export function Hero({
	eyebrow,
	title,
	sub,
	primaryCta,
	secondaryCta,
	children,
	align = "center",
}: HeroProps) {
	const centered = align === "center";
	return (
		<section
			className={cn(
				"relative overflow-hidden px-4 pt-14 pb-10 sm:pt-20",
				centered ? "text-center" : "text-left",
			)}
		>
			<div aria-hidden className="gb-dotgrid pointer-events-none absolute inset-0" />
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-3xl rounded-full opacity-25 blur-3xl"
				style={{
					background:
						"color-mix(in oklab, var(--primary) 32%, transparent), color-mix(in oklab, var(--chart-3) 22%, transparent)",
				}}
			/>
			<div className={cn("relative mx-auto w-full max-w-3xl", centered && "items-center")}>
				{eyebrow ? (
					<Reveal>
						<span className="gb-eyebrow">{eyebrow}</span>
					</Reveal>
				) : null}
				<Reveal delay={80}>
					<h1 className="gb-display mt-5 text-4xl font-semibold text-balance sm:text-6xl">
						{title}
					</h1>
				</Reveal>
				{sub ? (
					<Reveal delay={160}>
						<p className="gb-sub mx-auto mt-5 max-w-xl text-base text-pretty sm:text-lg">{sub}</p>
					</Reveal>
				) : null}
				{primaryCta || secondaryCta ? (
					<Reveal delay={240}>
						<div
							className={cn(
								"mt-7 flex flex-wrap items-center gap-2.5",
								centered && "justify-center",
							)}
						>
							{primaryCta ? (
								<Button
									className="h-10 rounded-full px-5 text-sm"
									nativeButton={false}
									render={<a aria-label={primaryCta.label} href={primaryCta.href} />}
									size="lg"
								>
									{primaryCta.label}
								</Button>
							) : null}
							{secondaryCta ? (
								<Button
									className="h-10 rounded-full px-5 text-sm"
									nativeButton={false}
									render={<a aria-label={secondaryCta.label} href={secondaryCta.href} />}
									size="lg"
									variant="outline"
								>
									{secondaryCta.label}
								</Button>
							) : null}
						</div>
					</Reveal>
				) : null}
				{children ? <Reveal delay={320}>{children}</Reveal> : null}
			</div>
		</section>
	);
}

/** Rounded product frame with soft lift shadow, GitBook-screenshot style. */
export function HeroFrame({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"gb-frame mx-auto mt-12 overflow-hidden rounded-2xl border border-border bg-card text-left",
				className,
			)}
		>
			<div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
				<span aria-hidden className="size-2.5 rounded-full bg-border" />
				<span aria-hidden className="size-2.5 rounded-full bg-border" />
				<span aria-hidden className="size-2.5 rounded-full bg-border" />
				<span className="ml-2 hidden truncate font-mono text-xs text-muted-foreground sm:block">
					docs · live preview
				</span>
			</div>
			<div className="p-4 sm:p-6">{children}</div>
		</div>
	);
}
