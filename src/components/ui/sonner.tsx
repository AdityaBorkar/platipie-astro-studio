"use client";

import {
	CircleCheckIcon,
	InfoIcon,
	TriangleAlertIcon,
	OctagonXIcon,
	Loader2Icon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "#/hooks/use-theme";

const Toaster = ({ ...props }: ToasterProps) => {
	const { mode = "system" } = useTheme();

	return (
		<Sonner
			theme={mode as ToasterProps["theme"]}
			className="group"
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			style={
				{
					"--border-radius": "var(--radius)",
					"--error-bg": "color-mix(in oklab, var(--destructive) 10%, var(--popover))",
					"--error-border": "color-mix(in oklab, var(--destructive) 35%, var(--border))",
					"--error-text": "var(--destructive)",
					"--info-bg": "var(--brand-soft)",
					"--info-border": "color-mix(in oklab, var(--brand) 28%, var(--border))",
					"--info-text": "var(--brand)",
					"--normal-bg": "var(--popover)",
					"--normal-border": "var(--border)",
					"--normal-text": "var(--popover-foreground)",
					"--success-bg": "color-mix(in oklab, var(--brand-mint) 22%, var(--popover))",
					"--success-border": "color-mix(in oklab, var(--success) 30%, var(--border))",
					"--success-text": "var(--success)",
					"--warning-bg": "color-mix(in oklab, var(--warning) 10%, var(--popover))",
					"--warning-border": "color-mix(in oklab, var(--warning) 35%, var(--border))",
					"--warning-text": "var(--warning)",
					fontFamily: "var(--font-sans)",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "cn-toast",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
