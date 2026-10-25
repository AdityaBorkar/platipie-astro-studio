import { ArrowRightIcon, CheckIcon, CopyIcon, SparklesIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

export interface AgentButton {
	href: string;
	icon?: LucideIcon;
	label: string;
}

interface AgentRowProps {
	className?: string;
	items?: AgentButton[];
	title?: string;
}

const defaultAgents: AgentButton[] = [
	{ href: "/design", icon: SparklesIcon, label: "Claude" },
	{ href: "/design", label: "ChatGPT" },
	{ href: "/design", label: "Cursor" },
];

/**
 * GitBook's AI setup strip: white pills inside an orange-glowed capsule.
 * The glow is a blurred duplicate beneath the real container, so it stays
 * cheap and never animates layout.
 */
export function AgentRow({
	className,
	items = defaultAgents,
	title = "Get started with AI",
}: AgentRowProps) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 1800);
		return () => clearTimeout(timer);
	}, [copied]);

	async function copyPrompt() {
		try {
			await navigator.clipboard.writeText(
				"Set up platipie in this repo. Read DESIGN.md first, then use the design system components in src/components/gitbook/ and tokens in src/styles.css. Keep primary actions black and brand emphasis orange.",
			);
			setCopied(true);
		} catch {
			/* clipboard can be blocked on insecure origins */
		}
	}

	return (
		<Reveal className={cn("mx-auto w-page px-5 py-14", className)}>
			<h2 className="text-center text-2xl font-bold tracking-heading sm:text-heading">{title}</h2>
			<div className="relative mx-auto mt-5 max-w-3xl">
				<div
					aria-hidden="true"
					className="absolute inset-x-6 -inset-y-2 rounded-full bg-brand/20 blur-2xl"
				/>
				<div className="relative rounded-full border border-brand/25 bg-brand/5 p-4 shadow-soft">
					<div className="grid gap-2 sm:grid-cols-3">
						{items.map((item) => {
							const Icon = item.icon;
							return (
								<a
									className="group inline-flex h-10 items-center justify-center gap-2 rounded-full bg-card px-4 text-sm font-bold tracking-tight text-foreground ring-1 ring-transparent transition-gb hover:-translate-y-0.5 hover:bg-brand hover:text-brand-foreground hover:ring-brand/30"
									href={item.href}
									key={item.label}
								>
									{Icon ? <Icon className="size-4" /> : null}
									{item.label}
								</a>
							);
						})}
					</div>
				</div>
			</div>
			<div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
				<span className="font-semibold">Set up platipie with your agent</span>
				<button
					className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
					onClick={() => void copyPrompt()}
					type="button"
				>
					{copied ? (
						<CheckIcon className="size-3.5 text-brand" />
					) : (
						<CopyIcon className="size-3.5" />
					)}
					{copied ? "Copied" : "Copy prompt"}
				</button>
				<a
					className="group inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
					href="/design"
				>
					Learn more
					<ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
				</a>
			</div>
		</Reveal>
	);
}
