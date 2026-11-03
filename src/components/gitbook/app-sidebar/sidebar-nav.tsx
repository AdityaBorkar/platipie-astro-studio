import { Link, useRouterState } from "@tanstack/react-router";
import {
	ChevronRightIcon,
	DatabaseIcon,
	FileCogIcon,
	FileIcon,
	FileStackIcon,
	ImageIcon,
	LayoutDashboardIcon,
	PaletteIcon,
	Settings2Icon,
	ShapesIcon,
	ZapIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";
import { useHash } from "./hooks";
import type { CollectionSummary, WorkspacePayload } from "./hooks";

export type SidebarRoute =
	| "/assets"
	| "/components"
	| "/content"
	| "/dashboard"
	| "/design"
	| "/pages"
	| "/settings";

export type SidebarHref = SidebarRoute | `${SidebarRoute}#${string}`;

const SIDEBAR_ROUTES: readonly SidebarRoute[] = [
	"/assets",
	"/components",
	"/content",
	"/dashboard",
	"/design",
	"/pages",
	"/settings",
];

function parseSidebarHref(href: SidebarHref): { hash?: string; to: SidebarRoute } {
	for (const route of SIDEBAR_ROUTES) {
		if (href === route) return { to: route };
		if (href.startsWith(`${route}#`)) return { hash: href.slice(route.length + 1), to: route };
	}
	if (import.meta.env.DEV)
		console.warn(`Unknown sidebar href "${href}", falling back to /dashboard`);
	return { to: "/dashboard" };
}

interface ShellLink {
	description?: string;
	href: SidebarHref;
	label: string;
}

const designLinks: ShellLink[] = [
	{ href: "/design", label: "Design System" },
	{ href: "/design#tokens", label: "Tokens" },
	{ href: "/design#brand", label: "Brand Guidelines" },
	{ href: "/design#style", label: "Style Guide" },
	{ href: "/design#languages", label: "Design Languages" },
	{ href: "/design#components", label: "Component gallery" },
	{ href: "/design#motion", label: "Animations" },
	{ href: "/design#viewports", label: "Viewports" },
	{ href: "/design#patterns", label: "Patterns" },
];

const componentLinks: ShellLink[] = [
	{ href: "/components#components", label: "Components" },
	{ href: "/components#layouts", label: "Layouts" },
	{ href: "/components#templates", label: "Templates" },
];

function AppLink({
	"aria-controls": ariaControls,
	"aria-expanded": ariaExpanded,
	children,
	className,
	href,
	onClick,
}: {
	"aria-controls"?: string;
	"aria-expanded"?: boolean;
	children: ReactNode;
	className?: string;
	href: SidebarHref;
	onClick?: () => void;
}) {
	const parsed = parseSidebarHref(href);
	return (
		<Link
			aria-controls={ariaControls}
			aria-expanded={ariaExpanded}
			className={className}
			hash={parsed.hash}
			onClick={onClick}
			to={parsed.to}
		>
			{children}
		</Link>
	);
}

function isActive(href: SidebarHref, pathname: string, activeHref: string, exact: boolean) {
	const [path, hash] = href.split("#");
	if (path !== pathname) return false;
	if (!hash) return exact ? activeHref === path : true;
	if (!exact) return true;
	return activeHref.endsWith(`#${hash}`);
}

function SidebarLink({
	active,
	href,
	icon: Icon,
	label,
	onClick,
}: {
	active: boolean;
	href: SidebarHref;
	icon: LucideIcon;
	label: string;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className={cn(
					"flex items-center gap-2 rounded-lg px-2 py-1.5 text-13 font-semibold transition-colors outline-none focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/40",
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
				)}
				href={href}
				onClick={onClick}
			>
				<Icon className="size-4 shrink-0" />
				<span className="truncate">{label}</span>
			</AppLink>
		</li>
	);
}

function SidebarChildLink({
	active,
	description,
	href,
	label,
	meta,
	onClick,
}: {
	active: boolean;
	description?: string;
	href: SidebarHref;
	label: string;
	meta?: number;
	onClick?: () => void;
}) {
	return (
		<li>
			<AppLink
				className={cn(
					"flex items-center gap-2 rounded-md px-2 py-1 text-12 transition-colors outline-none focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/40",
					active
						? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
				)}
				href={href}
				onClick={onClick}
			>
				<span className="min-w-0 flex-1">
					<span className="block truncate">{label}</span>
					{description ? (
						<span className="mt-0.5 block text-10 leading-snug text-muted-foreground">
							{description}
						</span>
					) : null}
				</span>
				{meta === undefined ? null : (
					<span className="shrink-0 font-mono text-10 text-muted-foreground">{meta}</span>
				)}
			</AppLink>
		</li>
	);
}

const pageKindMeta = {
	dynamic: { icon: ZapIcon, label: "Dynamic page" },
	static: { icon: FileIcon, label: "Static page" },
	utility: { icon: FileCogIcon, label: "Utility route" },
} satisfies Record<WorkspacePayload["pages"][number]["kind"], { icon: LucideIcon; label: string }>;

const pageKindOrder = { dynamic: 1, static: 0, utility: 2 } satisfies Record<
	WorkspacePayload["pages"][number]["kind"],
	number
>;

function SidebarPageLink({
	active,
	onClick,
	page,
}: {
	active: boolean;
	onClick?: () => void;
	page: WorkspacePayload["pages"][number];
}) {
	const { icon: Icon, label } = pageKindMeta[page.kind];
	return (
		<li>
			<Link
				aria-current={active ? "page" : undefined}
				aria-label={`${page.route} — ${label}`}
				className={cn(
					"flex items-center gap-2 rounded-md px-2 py-1 text-12 transition-colors outline-none focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/40",
					active
						? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
						: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
				)}
				onClick={onClick}
				search={{ page: page.route }}
				title={`${label} · ${page.title}`}
				to="/pages"
			>
				<Icon
					aria-hidden="true"
					className={cn("size-3.5 shrink-0", page.kind === "dynamic" && "text-brand")}
				/>
				<span className="truncate font-mono">{page.route}</span>
			</Link>
		</li>
	);
}

function SidebarGroup({
	active,
	children,
	expanded,
	href,
	icon: Icon,
	id,
	label,
	onClick,
	onToggle,
}: {
	active: boolean;
	children: ReactNode;
	expanded: boolean;
	href: SidebarHref;
	icon: LucideIcon;
	id: string;
	label: string;
	onClick?: () => void;
	onToggle: () => void;
}) {
	return (
		<li>
			<AppLink
				aria-controls={`sidebar-${id}`}
				aria-expanded={expanded}
				className={cn(
					"group/row flex items-center gap-2 rounded-lg px-2 py-1.5 text-13 font-semibold transition-gb hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/40",
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
				)}
				href={href}
				onClick={() => {
					onClick?.();
					onToggle();
				}}
			>
				<Icon className="size-4 shrink-0" />
				<span className="min-w-0 flex-1 truncate">{label}</span>
				<ChevronRightIcon
					aria-hidden="true"
					className={cn(
						"size-3.5 shrink-0 transition-transform duration-300",
						expanded ? "rotate-90" : "group-hover/row:translate-x-0.5",
					)}
				/>
			</AppLink>
			<div
				aria-hidden={expanded ? undefined : true}
				className="gb-accordion"
				data-open={expanded}
				id={`sidebar-${id}`}
				inert={!expanded}
			>
				<div className="min-h-0 overflow-hidden">
					<ul className="gb-accordion-body gb-accordion-list mt-0.5 ml-3 grid gap-0.5 border-l border-sidebar-border pl-2">
						{children}
					</ul>
				</div>
			</div>
		</li>
	);
}

function SidebarNav({
	collections,
	collectionsError,
	onNavigate,
	workspace,
}: {
	collections: CollectionSummary[];
	collectionsError: string | null;
	onNavigate?: () => void;
	workspace: WorkspacePayload | null;
}) {
	const hash = useHash();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const search = useRouterState({ select: (state) => state.location.search }) as {
		page?: string;
	};
	const activeHref = `${pathname}${hash}`;
	const [groups, setGroups] = useState<Record<string, boolean>>({});
	const pages = (workspace?.pages ?? []).toSorted(
		(a, b) => pageKindOrder[a.kind] - pageKindOrder[b.kind] || a.route.localeCompare(b.route),
	);
	const activePage = pathname === "/pages" ? search.page : undefined;

	function expanded(id: string, active: boolean) {
		return groups[id] ?? active;
	}

	function toggleGroup(id: string, current: boolean) {
		setGroups((previous) => ({ ...previous, [id]: !current }));
	}

	return (
		<ul className="grid gap-0.5">
			<SidebarLink
				active={pathname === "/dashboard"}
				href="/dashboard"
				icon={LayoutDashboardIcon}
				label="Dashboard"
				onClick={onNavigate}
			/>

			<SidebarGroup
				active={pathname === "/pages"}
				expanded={expanded("pages", pathname === "/pages")}
				href="/pages"
				icon={FileStackIcon}
				id="pages"
				label="Pages"
				onClick={onNavigate}
				onToggle={() => toggleGroup("pages", expanded("pages", pathname === "/pages"))}
			>
				{pages.map((page) => (
					<SidebarPageLink
						active={activePage === page.route}
						key={page.path}
						onClick={onNavigate}
						page={page}
					/>
				))}
			</SidebarGroup>

			<SidebarGroup
				active={pathname === "/content" || pathname.startsWith("/edit/")}
				expanded={expanded("content", pathname === "/content" || pathname.startsWith("/edit/"))}
				href="/content"
				icon={DatabaseIcon}
				id="content"
				label="Content"
				onClick={onNavigate}
				onToggle={() =>
					toggleGroup(
						"content",
						expanded("content", pathname === "/content" || pathname.startsWith("/edit/")),
					)
				}
			>
				{collections.map((collection) => (
					<SidebarChildLink
						active={isActive(`/content#${collection.id}`, pathname, activeHref, true)}
						href={`/content#${collection.id}`}
						key={collection.id}
						label={collection.label}
						meta={collection.count}
						onClick={onNavigate}
					/>
				))}
				{collections.length === 0 ? (
					<li className="px-2 py-1 text-12 text-muted-foreground">
						{collectionsError ?? "Loading collections…"}
					</li>
				) : null}
			</SidebarGroup>

			<SidebarLink
				active={pathname === "/assets"}
				href="/assets"
				icon={ImageIcon}
				label="Assets"
				onClick={onNavigate}
			/>

			<SidebarGroup
				active={pathname === "/components"}
				expanded={expanded("components", pathname === "/components")}
				href="/components"
				icon={ShapesIcon}
				id="components"
				label="Components"
				onClick={onNavigate}
				onToggle={() =>
					toggleGroup("components", expanded("components", pathname === "/components"))
				}
			>
				{componentLinks.map((link) => (
					<SidebarChildLink
						active={isActive(link.href, pathname, activeHref, true)}
						href={link.href}
						key={link.label}
						label={link.label}
						onClick={onNavigate}
					/>
				))}
			</SidebarGroup>

			<SidebarGroup
				active={pathname === "/design"}
				expanded={expanded("design", pathname === "/design")}
				href="/design"
				icon={PaletteIcon}
				id="design"
				label="Design"
				onClick={onNavigate}
				onToggle={() => toggleGroup("design", expanded("design", pathname === "/design"))}
			>
				{designLinks.map((link) => (
					<SidebarChildLink
						active={isActive(link.href, pathname, activeHref, true)}
						description={link.description}
						href={link.href}
						key={link.label}
						label={link.label}
						onClick={onNavigate}
					/>
				))}
			</SidebarGroup>

			<SidebarLink
				active={pathname === "/settings"}
				href="/settings"
				icon={Settings2Icon}
				label="Settings"
				onClick={onNavigate}
			/>
		</ul>
	);
}

export { SidebarNav };
