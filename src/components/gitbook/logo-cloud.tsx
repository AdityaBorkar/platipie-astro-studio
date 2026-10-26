import { cn } from "#/lib/utils";
import { Reveal } from "./motion";

interface LogoCloudProps {
	className?: string;
	items?: string[];
	label?: string;
	variant?: "grid" | "marquee";
}

const defaultItems = ["Acme", "bunq", "FreedomPay", "OpenHQ", "Northwind", "Contoso", "Fabrikam"];

const styles: Record<string, string> = {
	Acme: "font-bold tracking-tight",
	Contoso: "font-semibold tracking-tight",
	Fabrikam: "font-mono font-semibold tracking-neg-45",
	FreedomPay: "font-bold tracking-14 uppercase",
	Northwind: "font-serif font-semibold tracking-tight",
	OpenHQ: "font-bold tracking-tight",
	bunq: "font-semibold tracking-neg-35 lowercase",
};

export function LogoWordmark({
	ariaHidden,
	className,
	name,
	size = "sm",
}: {
	ariaHidden?: boolean;
	className?: string;
	name: string;
	size?: "sm" | "md" | "lg";
}) {
	const scale = size === "lg" ? "text-2xl sm:text-3xl" : size === "md" ? "text-xl" : "text-15";
	const mark = name === "Acme" ? "+" : name === "OpenHQ" ? "◻" : name === "bunq" ? "●" : null;

	return (
		<span
			aria-hidden={ariaHidden}
			className={cn(
				"inline-flex items-baseline gap-1 whitespace-nowrap text-muted-foreground",
				scale,
				styles[name] ?? "font-semibold tracking-tight",
				className,
			)}
		>
			{mark ? <span className="text-12 leading-none">{mark}</span> : null}
			{name}
		</span>
	);
}

export function LogoCloud({
	className,
	items = defaultItems,
	label = "Trusted by teams shipping docs with platipie",
	variant = "marquee",
}: LogoCloudProps) {
	return (
		<Reveal className={cn("mx-auto w-page px-5 py-10", className)}>
			<p className="text-center text-11 font-bold tracking-14 text-muted-foreground uppercase">
				{label}
			</p>
			{variant === "grid" ? (
				<div className="mt-6 grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
					{items.map((name) => (
						<LogoWordmark key={name} name={name} />
					))}
				</div>
			) : (
				<div className="gb-mask-fade-x mt-5 overflow-hidden">
					<div className="gb-marquee-track animate-gb-marquee">
						{items.map((name) => (
							<LogoWordmark key={`a-${name}`} name={name} />
						))}
						{items.map((name) => (
							<LogoWordmark ariaHidden key={`b-${name}`} name={name} />
						))}
					</div>
				</div>
			)}
		</Reveal>
	);
}
