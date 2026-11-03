import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { ThemeMode } from "#/hooks/use-theme";
import { useTheme } from "#/hooks/use-theme";
import { cn } from "#/lib/utils";

const options: Array<{
	icon: LucideIcon;
	label: string;
	value: ThemeMode;
}> = [
	{ icon: SunIcon, label: "Light theme", value: "light" },
	{ icon: MoonIcon, label: "Dark theme", value: "dark" },
	{ icon: MonitorIcon, label: "System theme", value: "system" },
];

function ThemeOptionButton({
	active,
	onSelect,
	option,
}: {
	active: boolean;
	onSelect: (value: ThemeMode) => void;
	option: (typeof options)[number];
}) {
	const Icon = option.icon;

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						aria-label={option.label}
						aria-pressed={active}
						className={cn(active && "border-border bg-accent text-accent-foreground")}
						onClick={() => onSelect(option.value)}
						size="icon-xs"
						title={option.label}
						variant="ghost"
					/>
				}
			>
				<Icon className="size-3.5" />
			</TooltipTrigger>
			<TooltipContent>{option.label}</TooltipContent>
		</Tooltip>
	);
}

export function ThemeToggle() {
	const { mode, resolved, setMode } = useTheme();
	const isDark = resolved === "dark";

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
							className="sm:hidden"
							onClick={() => setMode(isDark ? "light" : "dark")}
							size="icon"
							title={isDark ? "Switch to light theme" : "Switch to dark theme"}
							variant="ghost"
						/>
					}
				>
					{isDark ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
				</TooltipTrigger>
				<TooltipContent>{isDark ? "Switch to light theme" : "Switch to dark theme"}</TooltipContent>
			</Tooltip>
			<fieldset
				aria-label="Theme"
				className="m-0 hidden items-center gap-px rounded-full border bg-background/70 p-px backdrop-blur-sm sm:inline-flex"
			>
				<legend className="sr-only">Theme</legend>
				{options.map((option) => (
					<ThemeOptionButton
						active={mode === option.value}
						key={option.value}
						onSelect={setMode}
						option={option}
					/>
				))}
			</fieldset>
		</>
	);
}
