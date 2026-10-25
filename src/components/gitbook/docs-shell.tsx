import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

interface DocsShellProps {
	sidebar: ReactNode;
	children: ReactNode;
	toc?: ReactNode;
}

interface DocsNavItem {
	active?: boolean;
	href: string;
	label: string;
}

interface DocsNavGroup {
	items: DocsNavItem[];
	title: string;
}

/** GitBook docs layout: sticky tree nav, centered content, sticky TOC rail. */
export function DocsShell({ sidebar, children, toc }: DocsShellProps) {
	return (
		<div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-docs-shell xl:grid-cols-docs-wide">
			<aside className="hidden lg:block">
				<div className="sticky top-24 max-h-docs-rail overflow-y-auto pr-2">{sidebar}</div>
			</aside>
			<main className="min-w-0">{children}</main>
			{toc ? (
				<aside className="hidden xl:block">
					<div className="sticky top-24 max-h-docs-rail overflow-y-auto text-sm">{toc}</div>
				</aside>
			) : null}
		</div>
	);
}

/** Sidebar tree group with GitBook active-row treatment. */
export function DocsNav({ groups }: { groups: DocsNavGroup[] }) {
	return (
		<nav aria-label="Docs" className="grid gap-5">
			{groups.map((g) => (
				<div key={g.title}>
					<p className="px-2 text-xs font-semibold tracking-12 text-muted-foreground uppercase">
						{g.title}
					</p>
					<ul className="mt-1.5 grid gap-0.5">
						{g.items.map((item) => (
							<li key={item.label}>
								<a
									aria-current={item.active ? "page" : undefined}
									className={cn(
										"block truncate rounded-lg px-2 py-1.5 text-sm transition-colors",
										item.active
											? "bg-muted font-medium text-foreground ring-1 ring-foreground/10"
											: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
									)}
									href={item.href}
								>
									{item.label}
								</a>
							</li>
						))}
					</ul>
				</div>
			))}
		</nav>
	);
}

/** Right-rail table of contents with active link highlight. */
export function DocsToc({ items }: { items: { active?: boolean; href: string; label: string }[] }) {
	return (
		<nav aria-label="On this page" className="border-l border-border pl-4">
			<p className="text-xs font-semibold tracking-12 text-muted-foreground uppercase">
				On this page
			</p>
			<ul className="mt-2 grid gap-1">
				{items.map((item) => (
					<li key={item.href}>
						<a
							aria-current={item.active ? "true" : undefined}
							className={cn(
								"block truncate text-13 transition-colors",
								item.active
									? "font-medium text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
							href={item.href}
						>
							{item.label}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
