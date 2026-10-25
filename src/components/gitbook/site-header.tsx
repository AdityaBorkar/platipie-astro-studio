import { BookOpenIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { SearchTrigger } from "./search-trigger";

interface SiteHeaderProps {
	brand?: string;
	links?: { href: string; label: string; active?: boolean }[];
	announcement?: ReactNode;
	onSearch?: () => void;
}

/**
 * GitBook marketing-style header: slim announcement pill above a sticky,
 * blurred nav. All colors resolve to shadcn tokens.
 */
export function SiteHeader({ brand, links, announcement, onSearch }: SiteHeaderProps) {
	return (
		<header className="sticky top-0 z-40">
			{announcement ? (
				<div className="flex justify-center border-b border-border bg-card px-4 py-1.5">
					<p className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-border bg-muted/70 px-3 py-1 text-xs text-muted-foreground">
						<span
							aria-hidden
							className="gb-glow inline-block size-1.5 shrink-0 rounded-full bg-primary"
						/>
						<span className="truncate">{announcement}</span>
					</p>
				</div>
			) : null}
			<div className="border-b border-border bg-background/70 backdrop-blur-xl">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
					<a className="inline-flex items-center gap-2" href="/">
						<span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<BookOpenIcon className="size-4" />
						</span>
						<strong className="text-sm font-semibold tracking-tight">{brand ?? "platipie"}</strong>
					</a>
					<nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
						{(links ?? []).map((l) => (
							<a
								aria-current={l.active ? "page" : undefined}
								className={cn(
									"rounded-full px-3 py-1.5 text-sm transition-colors",
									l.active
										? "bg-muted font-medium text-foreground"
										: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
								)}
								href={l.href}
								key={l.label}
							>
								{l.label}
							</a>
						))}
					</nav>
					<div className="ml-auto flex items-center gap-2">
						<SearchTrigger className="hidden lg:inline-flex" onClick={onSearch} />
						<Button
							className="rounded-full"
							nativeButton={false}
							render={<a aria-label="Get started" href="/" />}
							size="sm"
						>
							Get started
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
}
