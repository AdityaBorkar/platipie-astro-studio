import { BookOpenIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Reveal } from "./motion";

interface FooterProps {
	brand?: string;
	tagline?: string;
	columns?: { title: string; links: { href: string; label: string }[] }[];
}

/** GitBook footer flow: CTA panel into quiet multi-column link footer. */
export function Footer({ brand, tagline, columns }: FooterProps) {
	return (
		<footer className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10">
			<Reveal>
				<div className="overflow-hidden rounded-2xl border border-border bg-secondary/60 px-6 py-10 text-center sm:px-12">
					<span className="gb-eyebrow">Get started</span>
					<h2 className="gb-display mx-auto mt-4 max-w-xl text-3xl font-semibold text-balance sm:text-4xl">
						Accurate docs. Better answers.
					</h2>
					<p className="gb-sub mx-auto mt-3 max-w-md text-sm sm:text-base">
						{tagline ?? "Publish docs your users — and their agents — can trust."}
					</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
						<Button
							className="h-10 rounded-full px-5"
							nativeButton={false}
							render={<a aria-label="Start for free" href="/" />}
						>
							Start for free
						</Button>
						<Button
							className="h-10 rounded-full px-5"
							nativeButton={false}
							render={<a aria-label="View design system" href="/design" />}
							variant="outline"
						>
							View design system
						</Button>
					</div>
				</div>
			</Reveal>
			<div className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-5">
				<div className="lg:col-span-2">
					<p className="inline-flex items-center gap-2">
						<span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<BookOpenIcon className="size-4" />
						</span>
						<strong className="text-sm font-semibold tracking-tight">{brand ?? "platipie"}</strong>
					</p>
					<p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
						A GitBook-inspired design layer, adapted to shadcn tokens. Soft radii, quiet borders,
						spring motion.
					</p>
				</div>
				{(columns ?? []).map((col) => (
					<div key={col.title}>
						<p className="text-xs font-semibold tracking-12 text-muted-foreground uppercase">
							{col.title}
						</p>
						<ul className="mt-3 grid gap-2">
							{col.links.map((l) => (
								<li key={l.label}>
									<a
										className="text-sm text-muted-foreground transition-colors hover:text-foreground"
										href={l.href}
									>
										{l.label}
									</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<p className="mt-8 text-xs text-muted-foreground">
				© 2026 {brand ?? "platipie"} — inspired by GitBook, built on shadcn tokens.
			</p>
		</footer>
	);
}
