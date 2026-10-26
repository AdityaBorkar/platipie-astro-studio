import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

interface DocsShellProps {
	children: ReactNode;
	sidebar: ReactNode;
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

export function DocsShell({ sidebar, children, toc }: DocsShellProps) {
	return (
		<div className="mx-auto grid w-page gap-8 px-5 py-10 lg:grid-cols-docs-shell xl:grid-cols-docs-wide">
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

export function DocsNav({ groups }: { groups: DocsNavGroup[] }) {
	return (
		<nav aria-label="Docs" className="grid gap-6">
			{groups.map((group) => (
				<div key={group.title}>
					<p className="px-2 text-11 font-bold tracking-12 text-muted-foreground uppercase">
						{group.title}
					</p>
					<ul className="mt-2 grid gap-0.5">
						{group.items.map((item) => (
							<li key={item.label}>
								<a
									aria-current={item.active ? "page" : undefined}
									className={cn(
										"block truncate rounded-md border-l-2 px-2.5 py-1.5 text-sm transition-colors",
										item.active
											? "border-brand bg-brand-soft font-semibold text-brand"
											: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
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

export function DocsToc({ items }: { items: { active?: boolean; href: string; label: string }[] }) {
	return (
		<nav aria-label="On this page" className="border-l border-border pl-4">
			<p className="text-11 font-bold tracking-12 text-muted-foreground uppercase">On this page</p>
			<ul className="mt-3 grid gap-1.5">
				{items.map((item) => (
					<li key={item.label}>
						<a
							aria-current={item.active ? "true" : undefined}
							className={cn(
								"block truncate text-13 transition-colors",
								item.active
									? "font-semibold text-brand"
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
