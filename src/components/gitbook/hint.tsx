import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

type HintVariant = "info" | "success" | "warning" | "danger";

const styles: Record<HintVariant, { icon: typeof InfoIcon; iconWrap: string; wrap: string }> = {
	danger: {
		icon: CircleAlertIcon,
		iconWrap: "bg-destructive/12 text-destructive",
		wrap: "border-destructive/25 bg-destructive/[0.07]",
	},
	info: {
		icon: InfoIcon,
		iconWrap: "bg-primary/12 text-primary",
		wrap: "border-primary/25 bg-primary/[0.07]",
	},
	success: {
		icon: CircleCheckIcon,
		iconWrap: "bg-chart-2/15 text-chart-2",
		wrap: "border-chart-2/30 bg-chart-2/10",
	},
	warning: {
		icon: TriangleAlertIcon,
		iconWrap: "bg-chart-3/20 text-accent-foreground",
		wrap: "border-chart-3/40 bg-chart-3/10",
	},
};

interface HintProps {
	children: ReactNode;
	className?: string;
	title?: string;
	variant?: HintVariant;
}

/** GitBook docs callout: tinted panel, icon chip, compact title + body. */
export function Hint({ variant = "info", title, children, className }: HintProps) {
	const s = styles[variant];
	const Icon = s.icon;
	return (
		<div
			className={cn(
				"flex gap-3 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
				s.wrap,
				className,
			)}
			role="note"
		>
			<span
				className={cn(
					"mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg",
					s.iconWrap,
				)}
			>
				<Icon className="size-3.5" />
			</span>
			<div className="min-w-0">
				{title ? <p className="font-semibold text-foreground">{title}</p> : null}
				<div className="text-foreground/80">{children}</div>
			</div>
		</div>
	);
}
