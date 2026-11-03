import { MousePointerClickIcon, TypeIcon, ZapIcon } from "lucide-react";

import { Hint, Reveal } from "#/components/gitbook";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { keyframes, motionTokens } from "../data";
import { DesignSection, Panel, DisclosureDemo, MotionCard } from "../shared";

export function MotionSection() {
	return (
		<DesignSection
			description="Motion resolves content rather than decorating it. Every entrance is transform + opacity, every duration is short, and everything disappears under reduced-motion."
			eyebrow="06 · Motion"
			id="motion"
			title="Spring ease, one-shot reveals, marching details"
		>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<MotionCard label="Reveal" note="750ms · translate + blur">
					<Reveal>
						<div className="animate-gb-float rounded-xl border border-border bg-card p-4 shadow-soft">
							<p className="text-xs font-bold">Resolves into place</p>
							<p className="mt-1 text-10 text-muted-foreground">fade · rise · deblur</p>
						</div>
					</Reveal>
				</MotionCard>
				<MotionCard label="Disclosure" note="500ms · track + deblur">
					<DisclosureDemo />
				</MotionCard>
				<MotionCard label="Marching dash" note="1.6s · linear loop">
					<svg aria-hidden="true" className="h-20 w-full" viewBox="0 0 200 80">
						<ellipse className="gb-connector dash-march" cx="100" cy="40" rx="80" ry="28" />
						<circle cx="100" cy="40" fill="var(--brand)" r="3" />
					</svg>
				</MotionCard>
				<MotionCard label="Marquee" note="38s · pause on hover">
					<div className="gb-mask-fade-x overflow-hidden">
						<div className="gb-marquee-track animate-gb-marquee gap-6">
							{["Acme", "bunq", "OpenHQ", "Northwind", "Contoso", "Fabrikam"].map((name) => (
								<span
									className="text-sm font-bold tracking-tight whitespace-nowrap text-muted-foreground"
									key={name}
								>
									{name}
								</span>
							))}
						</div>
					</div>
				</MotionCard>
				<MotionCard label="Brand glow" note="5s · ease-in-out pulse">
					<div className="rounded-full border border-brand/25 bg-brand/5 p-3">
						<div className="animate-gb-glow rounded-full bg-brand/20 px-6 py-3 text-center text-10 font-bold text-brand">
							content health
						</div>
					</div>
				</MotionCard>
				<MotionCard label="Hover lift" note="420ms · translateY(-4px)">
					<div className="gb-card-hover w-full max-w-52 rounded-xl border border-border bg-card p-4">
						<MousePointerClickIcon className="size-4 text-brand" />
						<p className="mt-2 text-xs font-bold">Hover this card</p>
						<p className="mt-0.5 text-10 text-muted-foreground">shadow-soft → shadow-lift</p>
					</div>
				</MotionCard>
			</div>

			<div className="mt-4 grid items-start gap-4 sm:grid-cols-3">
				{motionTokens.map((token) => (
					<Panel icon={ZapIcon} key={token.name} note={token.name} title={token.label}>
						<p className="font-mono text-11 text-muted-foreground">{token.value}</p>
						<p className="mt-2 text-11 leading-relaxed text-muted-foreground">{token.usage}</p>
					</Panel>
				))}
				<Panel icon={TypeIcon} note="three steps" title="Durations">
					<div className="grid gap-1.5 text-11">
						<div className="flex items-center justify-between gap-2">
							<code>transition-gb</code>
							<span className="font-mono text-muted-foreground">300ms</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<code>transition-card</code>
							<span className="font-mono text-muted-foreground">420ms</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<code>.gb-reveal</code>
							<span className="font-mono text-muted-foreground">750ms</span>
						</div>
					</div>
				</Panel>
			</div>

			<Panel className="mt-4" icon={TypeIcon} note="class → keyframe" title="Keyframe inventory">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Class</TableHead>
							<TableHead className="hidden sm:table-cell">Keyframe</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead className="hidden sm:table-cell">Use</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{keyframes.map((keyframe) => (
							<TableRow key={keyframe.className}>
								<TableCell className="font-mono text-10">{keyframe.className}</TableCell>
								<TableCell className="hidden font-mono text-10 text-muted-foreground sm:table-cell">
									{keyframe.name}
								</TableCell>
								<TableCell className="font-mono text-10 text-muted-foreground">
									{keyframe.duration}
								</TableCell>
								<TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
									{keyframe.usage}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Panel>

			<Hint className="mt-4" title="Reduced motion" variant="info">
				<code>prefers-reduced-motion: reduce</code> disables every animation and transition named
				above, and forces <code>.gb-reveal</code> to its resolved state. Scroll behavior becomes
				instant.
			</Hint>
		</DesignSection>
	);
}
