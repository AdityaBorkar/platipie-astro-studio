import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import {
	ArrowUpRightIcon,
	BlocksIcon,
	DatabaseIcon,
	GlobeIcon,
	ImageIcon,
	LayoutDashboardIcon,
	PaletteIcon,
	SearchIcon,
	SettingsIcon,
	SparklesIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "#/lib/utils";
import { BrandMark } from "./brand";

const actions = [
	{
		desc: "Collections, entries, and recent edits",
		href: "/",
		icon: LayoutDashboardIcon,
		label: "Dashboard",
	},
	{
		desc: "Astro routes, page metadata, and schema",
		href: "/website",
		icon: GlobeIcon,
		label: "Website",
	},
	{
		desc: "Tokens, brand, components, motion, and patterns",
		href: "/design",
		icon: PaletteIcon,
		label: "Design system",
	},
	{
		desc: "Surfaces, templates, and UI primitives",
		href: "/components",
		icon: BlocksIcon,
		label: "Components",
	},
	{
		desc: "Images under assets/images and public",
		href: "/assets",
		icon: ImageIcon,
		label: "Assets",
	},
	{
		desc: "CMS collections, entries, and SEO rails",
		href: "/content",
		icon: DatabaseIcon,
		label: "Content",
	},
	{
		desc: "Environment, appearance, raw config, and trash",
		href: "/settings",
		icon: SettingsIcon,
		label: "Settings",
	},
];

/**
 * GitBook's floating Ask pill, repurposed as a real quick-jump palette for the
 * workspace. The button and panel share the same quiet white surface; only the
 * spark and hover affordances carry the brand orange.
 */
export function AskWidget() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen(true);
			}
			if (event.key === "Escape") setOpen(false);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		if (open) inputRef.current?.focus();
	}, [open]);

	const filtered = actions.filter(
		(action) =>
			!query ||
			action.label.toLowerCase().includes(query.toLowerCase()) ||
			action.desc.toLowerCase().includes(query.toLowerCase()),
	);

	return (
		<div className="fixed right-4 bottom-4 z-40 print:hidden">
			{open ? (
				<div className="animate-gb-pop mb-2 w-80 max-w-85vw rounded-2xl border border-border bg-popover p-3 shadow-lift">
					<div className="flex items-center gap-2 px-1">
						<BrandMark className="size-4 text-brand" />
						<p className="text-sm font-bold tracking-tight">Ask platipie</p>
						<button
							aria-label="Close quick jump"
							className="ml-auto inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							onClick={() => setOpen(false)}
							type="button"
						>
							<XIcon className="size-3.5" />
						</button>
					</div>
					<p className="mt-0.5 px-1 text-xs text-muted-foreground">
						Jump to anything in the workspace.
					</p>
					<div className="mt-2 flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
						<SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
						<input
							aria-label="Search actions"
							className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search pages…"
							ref={inputRef}
							value={query}
						/>
					</div>
					<ul className="mt-2 grid gap-0.5">
						{filtered.length === 0 ? (
							<li className="px-2 py-4 text-center text-xs text-muted-foreground">
								No pages match “{query}”.
							</li>
						) : (
							filtered.map((action) => {
								const Icon = action.icon;
								return (
									<li key={action.label}>
										<Link
											className="group flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted"
											onClick={() => setOpen(false)}
											to={action.href as LinkProps["to"]}
										>
											<span className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-brand-soft group-hover:text-brand">
												<Icon className="size-3.5" />
											</span>
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-semibold">{action.label}</span>
												<span className="block truncate text-xs text-muted-foreground">
													{action.desc}
												</span>
											</span>
											<ArrowUpRightIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
										</Link>
									</li>
								);
							})
						)}
					</ul>
					<button
						className="mt-2 flex w-full items-center gap-1.5 rounded-lg bg-brand-soft px-2 py-1.5 text-left text-xs font-semibold text-brand"
						onClick={() => setOpen(false)}
						type="button"
					>
						<SparklesIcon className="size-3.5" />
						Tip: ⌘K opens this menu anywhere
					</button>
				</div>
			) : null}
			<button
				aria-expanded={open}
				className={cn(
					"group inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-sm font-semibold shadow-lift backdrop-blur transition-gb hover:-translate-y-0.5 hover:border-foreground/15 hover:bg-card",
					open && "border-foreground/15",
				)}
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				Ask
				<span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
					<SparklesIcon className="size-3" />
				</span>
			</button>
		</div>
	);
}
