import { ArrowRightIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { BrandMark } from "./brand";

interface FinalCtaProps {
	primary?: { href: string; label: string };
	secondary?: { href: string; label: string };
	sub?: string;
	title?: string;
}

const defaultPrimary = { href: "/", label: "Start for free" };
const defaultSecondary = { href: "/settings", label: "Talk to us" };

/**
 * GitBook's closing plate: a giant, nearly invisible logo watermark behind a
 * centered promise and two pill actions. The muted section separates it from
 * the footer without introducing a new color.
 */
export function FinalCta({
	primary = defaultPrimary,
	secondary = defaultSecondary,
	sub = "Your docs are already feeding AI. Are readers getting the right answers or the wrong ones?",
	title = "Accurate docs.\nBetter answers.",
}: FinalCtaProps) {
	return (
		<section className="relative overflow-hidden bg-muted px-5 py-24 sm:py-28">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 grid place-items-center"
			>
				<BrandMark className="size-80 text-foreground/5 sm:size-96" title="" />
				<BrandMark className="absolute size-64 text-foreground/5 sm:size-80" title="" />
			</div>
			<div className="relative mx-auto w-page text-center">
				<h2 className="gb-display mx-auto max-w-2xl text-3xl sm:text-display">
					{title.split("\n").map((line) => (
						<span className="block" key={line}>
							{line}
						</span>
					))}
				</h2>
				<p className="gb-sub mx-auto mt-5 max-w-xl text-base">{sub}</p>
				<div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
					<Button
						className="h-10 rounded-full px-5"
						nativeButton={false}
						render={<a aria-label={primary.label} href={primary.href} />}
						size="lg"
					>
						{primary.label}
						<ArrowRightIcon className="size-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
					</Button>
					<Button
						className="h-10 rounded-full px-5"
						nativeButton={false}
						render={<a aria-label={secondary.label} href={secondary.href} />}
						size="lg"
						variant="outline"
					>
						{secondary.label}
					</Button>
				</div>
			</div>
		</section>
	);
}
