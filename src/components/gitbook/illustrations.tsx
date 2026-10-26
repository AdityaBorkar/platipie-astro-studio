import {
	BracesIcon,
	CheckIcon,
	CircleCheckIcon,
	ClockIcon,
	GitBranchIcon,
	GitPullRequestIcon,
	KeyRoundIcon,
	Link2Icon,
	LockIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TriangleAlertIcon,
	UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";
import { BrandMark } from "./brand";

export function ArtPanel({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"relative flex min-h-80 items-center justify-center overflow-hidden rounded-2xl bg-muted p-5 sm:p-8",
				className,
			)}
		>
			<div
				aria-hidden="true"
				className="grid-fade pointer-events-none absolute inset-0 opacity-30"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-16 -bottom-20 size-64 rounded-full bg-brand/10 blur-3xl"
			/>
			<div className="relative w-full">{children}</div>
		</div>
	);
}

function TrafficLights() {
	return (
		<span aria-hidden="true" className="flex items-center gap-1">
			<span className="size-1.5 rounded-full bg-destructive/60" />
			<span className="size-1.5 rounded-full bg-warning/70" />
			<span className="size-1.5 rounded-full bg-brand-mint" />
		</span>
	);
}

export function StaleContentArt() {
	return (
		<ArtPanel>
			<div className="mx-auto w-full max-w-sm">
				<div className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
					<div className="flex items-center gap-2 border-b border-border pb-2">
						<TrafficLights />
						<span className="ml-1 font-mono text-9 text-muted-foreground">
							content/quickstart.md
						</span>
						<span className="ml-auto rounded-full bg-brand-soft px-1.5 py-0.5 text-9 font-semibold text-brand">
							drift
						</span>
					</div>
					<div className="mt-3 grid gap-1.5">
						<div className="h-2 w-2/3 rounded-full bg-foreground/15" />
						<div className="h-1.5 w-full rounded-full bg-muted" />
						<div className="h-1.5 w-5/6 rounded-full bg-muted" />
					</div>
					<div className="relative mt-3 rounded-lg border border-dashed border-brand/50 bg-brand-soft/60 p-2.5">
						<div className="flex items-start gap-2">
							<span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
								<TriangleAlertIcon className="size-2.5" />
							</span>
							<div className="min-w-0 flex-1">
								<div className="h-1.5 w-3/4 rounded-full bg-brand/35" />
								<div className="mt-1.5 h-1.5 w-full rounded-full bg-brand/20" />
								<p className="mt-2 text-9 font-semibold text-brand">
									Feature flag `beta_billing` no longer exists
								</p>
							</div>
						</div>
					</div>
					<div className="mt-3 grid gap-1.5">
						<div className="h-1.5 w-full rounded-full bg-muted" />
						<div className="h-1.5 w-4/5 rounded-full bg-muted" />
					</div>
				</div>
				<div className="animate-gb-float relative -mt-3 ml-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 shadow-soft">
					<BrandMark className="size-4 text-brand" />
					<span className="text-10 font-semibold">Checking the content for errors</span>
					<span className="absolute inset-x-3 -bottom-px h-px bg-brand/70" />
				</div>
			</div>
		</ArtPanel>
	);
}

const agentNodes: Array<{
	className: string;
	icon?: LucideIcon;
	label: string;
	avatar?: string;
}> = [
	{ avatar: "MC", className: "top-0 left-2", label: "Docs lead" },
	{ className: "top-2 right-4", icon: BracesIcon, label: "API agent" },
	{ className: "bottom-2 left-0", icon: SparklesIcon, label: "Assistant" },
	{ className: "right-0 bottom-0", icon: CircleCheckIcon, label: "Validator" },
];

export function AgentNetworkArt() {
	return (
		<ArtPanel>
			<div className="relative mx-auto h-64 w-full max-w-sm">
				<svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 360 260">
					<ellipse className="gb-connector dash-march" cx="180" cy="130" rx="146" ry="94" />
					<path className="gb-connector" d="M180 36v56M326 130h-56M180 224v-56M34 130h56" />
					<circle cx="180" cy="36" fill="var(--brand)" r="2.5" />
					<circle cx="326" cy="130" fill="var(--brand)" r="2.5" />
					<circle cx="180" cy="224" fill="var(--brand)" r="2.5" />
					<circle cx="34" cy="130" fill="var(--brand)" r="2.5" />
				</svg>

				<div className="absolute top-1/2 left-1/2 flex w-32 -translate-1/2 flex-col items-center gap-1.5 rounded-xl border border-brand/30 bg-card p-3 shadow-lift">
					<span className="flex gap-1">
						<span className="size-1.5 rounded-full bg-destructive/60" />
						<span className="size-1.5 rounded-full bg-warning/70" />
						<span className="size-1.5 rounded-full bg-brand-mint" />
					</span>
					<BrandMark className="size-8 text-foreground" />
					<span className="text-10 font-bold tracking-tight">Acme docs</span>
				</div>

				{agentNodes.map((node) => {
					const Icon = node.icon;
					return (
						<div
							className={cn(
								"absolute flex items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-soft",
								node.className,
							)}
							key={node.label}
						>
							{node.avatar ? (
								<span className="inline-flex size-6 items-center justify-center rounded-full bg-brand/15 text-9 font-bold text-brand">
									{node.avatar}
								</span>
							) : Icon ? (
								<span className="inline-flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
									<Icon className="size-3" />
								</span>
							) : null}
							<span className="hidden text-9 font-semibold sm:block">{node.label}</span>
							<span className="inline-flex size-4 items-center justify-center rounded-full bg-brand-mint/50 text-brand-mint-foreground">
								<CheckIcon className="size-2.5" />
							</span>
						</div>
					);
				})}
			</div>
		</ArtPanel>
	);
}

export function ReviewArt() {
	return (
		<ArtPanel>
			<div className="mx-auto grid w-full max-w-sm gap-2.5">
				<div className="rounded-xl border border-border bg-card p-3 shadow-soft">
					<div className="flex items-center gap-2 border-b border-border pb-2">
						<GitPullRequestIcon className="size-3.5 text-brand" />
						<span className="text-10 font-bold">Review changes</span>
						<span className="ml-auto rounded-full bg-brand-mint/35 px-1.5 py-0.5 text-9 font-semibold text-brand-mint-foreground">
							+2 checks
						</span>
					</div>
					<div className="mt-2 grid gap-1">
						<div className="flex items-center gap-1.5 rounded bg-brand-mint/20 px-1.5 py-1 font-mono text-9 text-brand-mint-foreground">
							<span className="text-brand">+</span>
							<span>Updated the authentication example</span>
						</div>
						<div className="flex items-center gap-1.5 rounded bg-destructive/5 px-1.5 py-1 font-mono text-9 text-destructive">
							<span>−</span>
							<span className="line-through opacity-70">Old rate-limit header</span>
						</div>
						<div className="flex items-center gap-1.5 rounded bg-brand-mint/20 px-1.5 py-1 font-mono text-9 text-brand-mint-foreground">
							<span className="text-brand">+</span>
							<span>Retry-After: 30</span>
						</div>
					</div>
					<div className="mt-2.5 flex items-center gap-1.5">
						<span className="inline-flex size-5 items-center justify-center rounded-full bg-brand/15 text-9 font-bold text-brand">
							MC
						</span>
						<span className="text-9 text-muted-foreground">Mira approved this change</span>
						<span className="ml-auto inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-9 font-semibold text-background">
							Merge
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 shadow-soft">
					<span className="inline-flex size-6 items-center justify-center rounded-md bg-brand-soft text-brand">
						<ClockIcon className="size-3" />
					</span>
					<div>
						<p className="text-9 font-bold">Review queue</p>
						<p className="text-9 text-muted-foreground">2 drifted pages · oldest first</p>
					</div>
					<span className="ml-auto font-mono text-9 text-muted-foreground">02</span>
				</div>
			</div>
		</ArtPanel>
	);
}

const orbitNodes: Array<{ className: string; icon: LucideIcon }> = [
	{ className: "top-0 left-1/2 -translate-x-1/2", icon: GitBranchIcon },
	{ className: "top-1/2 right-0 -translate-y-1/2", icon: SparklesIcon },
	{ className: "bottom-0 left-1/2 -translate-x-1/2", icon: ShieldCheckIcon },
	{ className: "top-1/2 left-0 -translate-y-1/2", icon: Link2Icon },
];

export function SystemOrbit() {
	return (
		<div className="relative mx-auto h-56 w-full max-w-3xl sm:h-64">
			<svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 760 240">
				<ellipse className="gb-connector dash-march" cx="380" cy="120" rx="318" ry="92" />
				<path className="gb-connector" d="M380 32v44M698 120h-48M380 208v-44M62 120h48" />
				<circle cx="380" cy="32" fill="var(--brand)" r="2.5" />
				<circle cx="698" cy="120" fill="var(--brand)" r="2.5" />
				<circle cx="380" cy="208" fill="var(--brand)" r="2.5" />
				<circle cx="62" cy="120" fill="var(--brand)" r="2.5" />
			</svg>
			<div className="absolute top-1/2 left-1/2 flex size-20 -translate-1/2 flex-col items-center justify-center gap-1 rounded-xl border border-brand/30 bg-card shadow-lift">
				<BrandMark className="size-9 text-foreground" />
				<span className="font-mono text-9 text-muted-foreground">cms</span>
			</div>
			{orbitNodes.map((node) => {
				const Icon = node.icon;
				return (
					<span
						className={cn(
							"absolute inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-soft",
							node.className,
						)}
						key={node.className}
					>
						<Icon className="size-4" />
					</span>
				);
			})}
		</div>
	);
}

export function EnterpriseArt() {
	return (
		<div className="gb-enterprise-art relative flex min-h-96 items-center justify-center overflow-hidden rounded-2xl p-6">
			<div aria-hidden="true" className="absolute inset-0 opacity-40">
				<svg className="size-full" viewBox="0 0 400 400">
					<g className="gb-connector-light dash-march">
						<ellipse cx="200" cy="200" rx="170" ry="84" transform="rotate(-24 200 200)" />
						<ellipse cx="200" cy="200" rx="170" ry="84" transform="rotate(46 200 200)" />
						<ellipse cx="200" cy="200" rx="170" ry="84" transform="rotate(108 200 200)" />
					</g>
				</svg>
			</div>
			<div className="relative grid w-full max-w-xs grid-cols-2 gap-2.5">
				{[
					{ icon: ShieldCheckIcon, label: "SOC 2" },
					{ icon: LockIcon, label: "ISO 27001" },
					{ icon: UsersIcon, label: "SAML SSO" },
					{ icon: KeyRoundIcon, label: "Access control" },
				].map((item) => {
					const Icon = item.icon;
					return (
						<div
							className="rounded-xl border border-on-brand/30 bg-on-brand/15 p-2.5 text-on-brand backdrop-blur-sm"
							key={item.label}
						>
							<Icon className="size-4" />
							<p className="mt-2 text-11 font-bold tracking-tight">{item.label}</p>
						</div>
					);
				})}
			</div>
			<div className="relative -ml-2 hidden size-24 shrink-0 flex-col items-center justify-center rounded-full border border-on-brand/40 bg-on-brand/15 text-on-brand backdrop-blur-sm sm:flex">
				<BrandMark className="size-8" />
				<span className="mt-1 text-9 font-bold tracking-tight">VERIFIED</span>
			</div>
		</div>
	);
}

export function IconTile({ icon: Icon }: { icon: LucideIcon }) {
	return (
		<span className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-xs">
			<Icon className="size-4" />
		</span>
	);
}
