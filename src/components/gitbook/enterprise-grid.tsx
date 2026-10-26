import { ArrowRightIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { EnterpriseArt, IconTile } from "./illustrations";
import { Reveal } from "./motion";

export interface EnterpriseFeature {
	desc: string;
	icon: LucideIcon;
	title: string;
}

interface EnterpriseGridProps {
	actions?: { href: string; label: string };
	className?: string;
	features: EnterpriseFeature[];
	sub?: string;
	title?: string;
}

export function EnterpriseGrid({ actions, className, features, sub, title }: EnterpriseGridProps) {
	const left = features.slice(0, 2);
	const right = features.slice(2, 4);

	return (
		<section className={cn("mx-auto w-page px-5 py-12 sm:py-16", className)}>
			<div className="mx-auto max-w-2xl text-center">
				<Reveal>
					<h2 className="text-2xl font-bold tracking-heading sm:text-display-sm">{title}</h2>
				</Reveal>
				{sub ? (
					<Reveal delay={70}>
						<p className="gb-sub mx-auto mt-4 max-w-xl text-base">{sub}</p>
					</Reveal>
				) : null}
				{actions ? (
					<Reveal delay={140}>
						<Button
							className="mt-5"
							nativeButton={false}
							render={<a aria-label={actions.label} href={actions.href} />}
							size="lg"
						>
							{actions.label}
							<ArrowRightIcon className="size-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
						</Button>
					</Reveal>
				) : null}
			</div>

			<div className="mt-12 grid items-center gap-8 lg:grid-cols-enterprise">
				<div className="grid gap-10">
					{left.map((feature, index) => (
						<Reveal delay={index * 70} key={feature.title}>
							<EnterpriseColumn feature={feature} />
						</Reveal>
					))}
				</div>
				<Reveal delay={80}>
					<EnterpriseArt />
				</Reveal>
				<div className="grid gap-10">
					{right.map((feature, index) => (
						<Reveal delay={index * 70} key={feature.title}>
							<EnterpriseColumn feature={feature} />
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}

function EnterpriseColumn({ feature }: { feature: EnterpriseFeature }) {
	return (
		<div>
			<IconTile icon={feature.icon} />
			<h3 className="mt-4 text-title font-bold tracking-heading">{feature.title}</h3>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
		</div>
	);
}
