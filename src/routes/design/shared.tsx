import { ChevronRightIcon, LayersIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { SectionHeader } from "#/components/gitbook";
import { Badge } from "#/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";
import type { ColorToken } from "./data";

export function DesignSection({
	actions,
	children,
	description,
	eyebrow,
	id,
	title,
}: {
	actions?: ReactNode;
	children: ReactNode;
	description: string;
	eyebrow: string;
	id: string;
	title: string;
}) {
	return (
		<section className="scroll-mt-28 border-t border-border py-12 sm:py-16" id={id}>
			<SectionHeader actions={actions} description={description} eyebrow={eyebrow} title={title} />
			<div className="mt-8">{children}</div>
		</section>
	);
}

export function Panel({
	children,
	className,
	icon: Icon,
	id,
	note,
	title,
}: {
	children: ReactNode;
	className?: string;
	icon?: LucideIcon;
	id?: string;
	note?: string;
	title: string;
}) {
	return (
		<div className={cn("rounded-xl border border-border bg-card p-5", className)} id={id}>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
					{Icon ? <Icon aria-hidden="true" className="size-4 text-brand" /> : null}
					{title}
				</h3>
				{note ? <span className="font-mono text-10 text-muted-foreground">{note}</span> : null}
			</div>
			{children}
		</div>
	);
}

export function Swatch({ className, token }: { className?: string; token: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn("block size-6 shrink-0 rounded-md ring-1 ring-border", className)}
			style={{ backgroundColor: `var(${token})` }}
		/>
	);
}

export function TokenTable({ rows }: { rows: ColorToken[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Token</TableHead>
					<TableHead className="hidden sm:table-cell">Light</TableHead>
					<TableHead className="hidden sm:table-cell">Dark</TableHead>
					<TableHead className="hidden sm:table-cell">Use</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.name}>
						<TableCell>
							<span className="flex items-center gap-2.5">
								<Swatch token={row.name} />
								<span className="font-mono text-11">{row.name}</span>
							</span>
							<span className="mt-1 block font-mono text-9 text-muted-foreground sm:hidden">
								{row.light} · {row.dark}
							</span>
						</TableCell>
						<TableCell className="hidden font-mono text-11 text-muted-foreground sm:table-cell">
							{row.light}
						</TableCell>
						<TableCell className="hidden font-mono text-11 text-muted-foreground sm:table-cell">
							{row.dark}
						</TableCell>
						<TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
							{row.usage}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export function CodeBlock({
	children,
	className,
	label,
}: {
	children: string;
	className?: string;
	label: string;
}) {
	return (
		<div className={cn("overflow-hidden rounded-xl border border-border", className)}>
			<div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
				<span className="font-mono text-9 font-bold tracking-12 text-muted-foreground uppercase">
					{label}
				</span>
				<Badge variant="outline">css</Badge>
			</div>
			<div className="code-surface rounded-none border-0">
				<pre className="overflow-x-auto p-4 text-11">{children}</pre>
			</div>
		</div>
	);
}

export function DisclosureDemo() {
	const [open, setOpen] = useState(true);
	return (
		<div className="w-full max-w-52">
			<button
				aria-expanded={open}
				className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-11 font-semibold text-muted-foreground transition-gb hover:bg-sidebar-accent hover:text-foreground"
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				<LayersIcon className="size-3.5 shrink-0" />
				<span className="flex-1 truncate">Product</span>
				<ChevronRightIcon
					className={cn("size-3.5 shrink-0 transition-transform duration-300", open && "rotate-90")}
				/>
			</button>
			<div
				aria-hidden={open ? undefined : true}
				className="gb-accordion"
				data-open={open}
				inert={!open}
			>
				<div className="min-h-0 overflow-hidden">
					<ul className="gb-accordion-body gb-accordion-list mt-0.5 ml-3 grid gap-0.5 border-l border-sidebar-border pl-2">
						{["Overview", "Changelog", "Roadmap"].map((label) => (
							<li className="rounded-md px-2 py-1 text-10 text-muted-foreground" key={label}>
								{label}
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}

export function MotionCard({
	children,
	label,
	note,
}: {
	children: ReactNode;
	label: string;
	note: string;
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card">
			<div className="flex h-28 items-center justify-center bg-muted/40 px-4">{children}</div>
			<div className="border-t border-border p-3">
				<p className="text-xs font-bold tracking-tight">{label}</p>
				<p className="mt-0.5 font-mono text-10 text-muted-foreground">{note}</p>
			</div>
		</div>
	);
}
