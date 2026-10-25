import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

interface LogoCloudProps {
	items: string[];
	label?: string;
}

/** GitBook social-proof strip: muted label + pausable logo marquee. */
export function LogoCloud({ label, items }: LogoCloudProps) {
	return (
		<section className="px-4 py-10">
			<Reveal className="mx-auto w-full max-w-6xl">
				<p className="text-center text-xs font-semibold tracking-14 text-muted-foreground uppercase">
					{label ?? "Trusted by docs teams"}
				</p>
				<div className="gb-mask-fade-x mt-5 overflow-hidden">
					<div className="animate-gb-marquee flex w-max items-center gap-3 pr-3">
						{items.map((name) => (
							<span
								className="inline-flex shrink-0 items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground"
								key={`logo-a-${name}`}
							>
								{name}
							</span>
						))}
						{items.map((name) => (
							<span
								aria-hidden
								className={cn(
									"inline-flex shrink-0 items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground",
								)}
								key={`logo-b-${name}`}
							>
								{name}
							</span>
						))}
					</div>
				</div>
			</Reveal>
		</section>
	);
}
