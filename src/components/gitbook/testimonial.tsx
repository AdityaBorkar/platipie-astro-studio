import { ArrowRightIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { LogoWordmark } from "./logo-cloud";
import { Reveal } from "./motion";

interface TestimonialProps {
	attribution: string;
	className?: string;
	company: string;
	initials: string;
	quote: string;
	jobTitle: string;
}

export function Testimonial({
	attribution,
	className,
	company,
	initials,
	quote,
	jobTitle,
}: TestimonialProps) {
	return (
		<section className={cn("mx-auto w-page px-5 py-12 sm:py-16", className)}>
			<Reveal className="grid items-start gap-8 md:grid-cols-quote md:gap-12">
				<div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center shadow-soft">
					<span className="relative inline-flex size-20 items-center justify-center rounded-full bg-brand-cream">
						<span
							aria-hidden="true"
							className="absolute inset-1 rounded-full border border-brand/20"
						/>
						<span className="inline-flex size-14 items-center justify-center rounded-full bg-brand text-lg font-bold text-brand-foreground">
							{initials}
						</span>
					</span>
					<LogoWordmark className="text-foreground" name={company} size="md" />
				</div>
				<figure className="max-w-2xl">
					<blockquote className="text-xl leading-snug font-semibold tracking-heading text-foreground sm:text-2xl">
						“{quote}”
					</blockquote>
					<figcaption className="mt-4 text-sm text-muted-foreground">
						{attribution}, {jobTitle}
						<span className="ml-2 font-semibold text-foreground/80">{company}</span>
					</figcaption>
					<Button
						className="mt-5"
						nativeButton={false}
						render={<a aria-label="Read the story" href="/design" />}
						size="sm"
					>
						Read the story
						<ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover/button:translate-x-0.5" />
					</Button>
				</figure>
			</Reveal>
		</section>
	);
}
