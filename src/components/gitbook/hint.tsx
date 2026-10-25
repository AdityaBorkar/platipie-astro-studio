import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

type HintVariant = "info" | "success" | "warning" | "danger";

const styles: Record<HintVariant, { icon: typeof InfoIcon; iconColor: string; wrap: string }> = {
	danger: {
		icon: CircleAlertIcon,
		iconColor: "text-destructive",
		wrap: "border-destructive/20 bg-destructive/5",
	},
	info: {
		icon: InfoIcon,
		iconColor: "text-brand",
		wrap: "border-brand/20 bg-brand-soft",
	},
	success: {
		icon: CircleCheckIcon,
		iconColor: "text-success",
		wrap: "border-brand-mint/60 bg-brand-mint/20",
	},
	warning: {
		icon: TriangleAlertIcon,
		iconColor: "text-warning",
		wrap: "border-warning/25 bg-warning/8",
	},
};

interface HintProps {
	children: ReactNode;
	className?: string;
	title?: string;
	variant?: HintVariant;
}

/**
 * GitBook docs callout: a tinted panel, a single colored icon, a compact bold
 * title, and a readable body. Kept border-light so it never competes with the
 * surrounding prose.
 */
export function Hint({ variant = "info", title, children, className }: HintProps) {
	const style = styles[variant];
	const Icon = style.icon;
	return (
		<div
			className={cn(
				"flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
				style.wrap,
				className,
			)}
			role="note"
		>
			<Icon className={cn("mt-0.5 size-4 shrink-0", style.iconColor)} />
			<div className="min-w-0">
				{title ? <p className="font-bold tracking-tight text-foreground">{title}</p> : null}
				<div className="text-foreground/75 [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2">
					{children}
				</div>
			</div>
		</div>
	);
}
